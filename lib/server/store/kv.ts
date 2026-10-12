/**
 * 跨实例状态的总线抽象：限流计数与后台配置此前都挂在进程内 globalThis 上，
 * 一旦多实例部署就会失真（限流被实例数放大、后台配置各实例漂移）。
 *
 * 这里把「一个带 TTL 的键值存储」抽成接口，提供两种后端：
 *  - memory：默认，挂在 globalThis，单实例下与旧实现行为一致；
 *  - redis ：可选，按 KV_BACKEND=redis + REDIS_URL 启用，状态跨实例共享。
 *
 * 所有方法都是异步的，便于外部后端；内存后端就地 resolve，不引入额外延迟。
 * 读路径（配置）在调用方仍按同步语义使用（见 store/*.ts 的水合+镜像策略）。
 */
import 'server-only';

import { getServerEnv } from '@/env';

export interface KvStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
  /** 原子自增并返回新值；ttlMs 仅在键首次创建（计数=1）时设置，复刻固定窗口语义 */
  incr(key: string, ttlMs?: number): Promise<number>;
  mget(keys: string[]): Promise<(string | null)[]>;
  mset(entries: Array<[string, string]>, ttlMs?: number): Promise<void>;
}

interface MemoryEntry {
  value: string;
  /** 0 表示不过期 */
  expiry: number;
}

/**
 * 内存后端的键数上限，超限先把已过期的键清出去。
 * 必须有这一层：限流键按窗口起点分桶（`rl:<桶>:<窗口序号>`），一个窗口结束后那个键就再也不会被
 * 读到，靠 get/incr 的惰性删除永远回收不到它，只会随流量线性堆积。
 */
const MEMORY_KV_CAPACITY = 5_000;

export class MemoryKvStore implements KvStore {
  private readonly map: Map<string, MemoryEntry>;

  constructor() {
    const store = globalThis as typeof globalThis & Record<string, unknown>;
    this.map = (store.__decamoreKv ??= new Map<string, MemoryEntry>()) as Map<string, MemoryEntry>;
  }

  private alive(entry: MemoryEntry, now: number): boolean {
    return entry.expiry === 0 || entry.expiry > now;
  }

  /** 只在超容量时清扫：正常流量下这条分支不会进，进了也是 O(n) 的一次遍历 */
  private enforceCapacity(now: number): void {
    if (this.map.size <= MEMORY_KV_CAPACITY) return;
    for (const [key, entry] of this.map) if (!this.alive(entry, now)) this.map.delete(key);
  }

  async get(key: string): Promise<string | null> {
    const now = Date.now();
    const entry = this.map.get(key);
    if (!entry || !this.alive(entry, now)) {
      this.map.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    const now = Date.now();
    this.map.set(key, { value, expiry: ttlMs && ttlMs > 0 ? now + ttlMs : 0 });
    this.enforceCapacity(now);
  }

  async del(key: string): Promise<void> {
    this.map.delete(key);
  }

  async incr(key: string, ttlMs?: number): Promise<number> {
    const now = Date.now();
    const entry = this.map.get(key);
    if (!entry || !this.alive(entry, now)) {
      this.map.set(key, { value: '1', expiry: ttlMs && ttlMs > 0 ? now + ttlMs : 0 });
      this.enforceCapacity(now);
      return 1;
    }
    const next = Number(entry.value) + 1;
    entry.value = String(next);
    return next;
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    return Promise.all(keys.map((key) => this.get(key)));
  }

  async mset(entries: Array<[string, string]>, ttlMs?: number): Promise<void> {
    await Promise.all(entries.map(([key, value]) => this.set(key, value, ttlMs)));
  }
}

/** ioredis 客户端的最小结构类型：构建环境未必装它，不引其类型 */
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, ttlMs?: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
  incrby(key: string, value: number): Promise<number>;
  mget(keys: string[]): Promise<Array<string | null>>;
  mset(...args: string[]): Promise<unknown>;
  pexpire(key: string, ms: number): Promise<unknown>;
  eval(script: string, numKeys: number, ...args: Array<string | number>): Promise<unknown>;
}

/** Redis 后端：incr 用一段 Lua 在首次创建键（计数=1）时才写过期，复刻内存端的固定窗口语义 */
class RedisKvStore implements KvStore {
  private constructor(private readonly client: RedisClient) {}

  /** 异步工厂：动态引入 ioredis（构建期不需该依赖）并建连 */
  static async create(connectionString: string): Promise<RedisKvStore> {
    // specifier 用 string 类型变量承载，并带上两个打包器的忽略注释：Turbopack 会把常量折叠的
    // 字符串当依赖解析、webpack 同样会追踪，缺 ioredis 时构建直接失败——加了忽略才让
    // 「构建期不必安装、运行时按需 import」这个前提真的成立。
    const specifier: string = 'ioredis';
    let mod: { default?: unknown } | unknown;
    try {
      mod = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ specifier);
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`KV_BACKEND=redis 需要 ioredis，但运行时导入失败：${reason}。请先执行 npm i ioredis。`);
    }
    const Redis = (mod as { default?: unknown })?.default ?? mod;
    if (typeof Redis !== 'function') {
      throw new Error('未能从 ioredis 取得 Redis 构造器，请确认已安装 ioredis');
    }
    const client = new (Redis as new (url: string) => RedisClient)(connectionString);
    return new RedisKvStore(client);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    if (ttlMs && ttlMs > 0) await this.client.set(key, value, 'PX', ttlMs);
    else await this.client.set(key, value);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async incr(key: string, ttlMs?: number): Promise<number> {
    const script =
      'local v = redis.call("incr", KEYS[1])\nif v == 1 and ARGV[1] ~= "0" then redis.call("pexpire", KEYS[1], ARGV[1]) end\nreturn v';
    return (await this.client.eval(script, 1, key, String(ttlMs ?? 0))) as number;
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    if (keys.length === 0) return [];
    return this.client.mget(keys);
  }

  async mset(entries: Array<[string, string]>, ttlMs?: number): Promise<void> {
    if (entries.length === 0) return;
    await this.client.mset(...entries.flatMap(([k, v]) => [k, v]));
    if (ttlMs && ttlMs > 0) {
      await Promise.all(entries.map(([k]) => this.client.pexpire(k, ttlMs)));
    }
  }
}

/**
 * Redis 后端构造需要 await 动态 import，而 getKvStore 需要同步返回。
 * 这个壳把异步连接收成「首次访问方法时才真正连」的同步对象。
 */
class LazyRedisKvStore implements KvStore {
  private inner: KvStore | null = null;
  private connecting: Promise<KvStore> | null = null;

  constructor(private readonly url: string) {}

  private ensure(): Promise<KvStore> {
    if (this.inner) return Promise.resolve(this.inner);
    if (!this.connecting) {
      this.connecting = RedisKvStore.create(this.url).then((store) => {
        this.inner = store;
        return store;
      });
    }
    return this.connecting;
  }

  async get(key: string): Promise<string | null> {
    return (await this.ensure()).get(key);
  }
  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    await (await this.ensure()).set(key, value, ttlMs);
  }
  async del(key: string): Promise<void> {
    await (await this.ensure()).del(key);
  }
  async incr(key: string, ttlMs?: number): Promise<number> {
    return (await this.ensure()).incr(key, ttlMs);
  }
  async mget(keys: string[]): Promise<(string | null)[]> {
    return (await this.ensure()).mget(keys);
  }
  async mset(entries: Array<[string, string]>, ttlMs?: number): Promise<void> {
    await (await this.ensure()).mset(entries, ttlMs);
  }
}

let cached: KvStore | undefined;
let backendName: 'memory' | 'redis' = 'memory';

/** 当前后端类型：默认 memory，KV_BACKEND=redis 时为 redis */
export function getKvBackend(): 'memory' | 'redis' {
  return backendName;
}

/** 取全局唯一的 KvStore；默认 memory，KV_BACKEND=redis 时按需建 Redis 连接 */
export function getKvStore(): KvStore {
  if (cached) return cached;
  const env = getServerEnv();
  backendName = env.KV_BACKEND === 'redis' ? 'redis' : 'memory';
  cached =
    backendName === 'redis'
      ? new LazyRedisKvStore(env.REDIS_URL ?? '')
      : new MemoryKvStore();
  return cached;
}

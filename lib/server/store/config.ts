/**
 * 后台配置的统一外壳：globalThis 单例 + 种子版本 + 可选 redis 水合与写镜像。
 *
 * 三件事由这里单点保证，各配置模块不再各写一遍：
 * 1. **引用不换**。水合与写入都只改对象/数组内部，绝不重新赋值 —— Next 按 route 分包，模块级变量每个
 *    chunk 各存一份，`SETTINGS = parsed` 这种整体替换只有当前 chunk 看得见，其它 chunk 会一直读旧值。
 * 2. **种子版本变了才重新播种**，否则 dev 热重载后进程里仍是旧形状。
 * 3. **redis 后端下冷启动水合一次、写操作顺手镜像**；memory 后端时水合与镜像都是空操作，行为与单进程内存版一致。
 *    语义是「启动对齐 + 写传播」，不是跨实例实时读。
 */
import 'server-only';

import { getKvBackend, getKvStore } from './kv';

/** 原地替换内容：数组走 length=0 + push，对象走清键 + assign，两种都不换引用 */
export function replaceInPlace<T extends object>(target: T, next: T): void {
  if (Array.isArray(target) && Array.isArray(next)) {
    target.length = 0;
    target.push(...(next as unknown[]));
    return;
  }
  for (const key of Object.keys(target)) delete (target as Record<string, unknown>)[key];
  Object.assign(target, next);
}

/** 认一个必然存在的字段即可：形状不对就丢弃外部数据、继续用内存种子 */
export const hasKey =
  <T>(key: string) =>
  (value: unknown): value is T =>
    value !== null && typeof value === 'object' && key in value;

interface KvBackedConfigOptions<T> {
  /** globalThis 槽位名（前缀固定 __decamore），改名等于换一份缓存 */
  slot: string;
  /** redis 键 */
  key: string;
  /** 默认值变了要 bump：进程内的编辑结果会被新版本种子覆盖 */
  seedVersion: string;
  seed: () => T;
  /** 外部存储里那份数据能不能用；不认的一律丢弃、保留内存种子 */
  accepts: (value: unknown) => value is T;
  /** 把外部数据写进已有单例，默认 `replaceInPlace`；要顺带清理运行时计数时自己传 */
  apply?: (target: T, next: T) => void;
  /** 重新播种之后的清理（与 id 绑定的运行时计数会随种子失效） */
  onReseed?: () => void;
}

interface KvBackedConfig<T> {
  /** 内存单例，引用稳定；要不要拷一份给调用方，各模块自己决定 */
  readonly value: T;
  /** 把当前值镜像到外部存储；memory 后端时空操作 */
  mirror: () => void;
}

export function createKvBackedConfig<T extends object>(options: KvBackedConfigOptions<T>): KvBackedConfig<T> {
  const store = globalThis as typeof globalThis & Record<string, unknown>;
  const valueSlot = `__decamore${options.slot}`;
  const seedSlot = `${valueSlot}Seed`;

  if (store[seedSlot] !== options.seedVersion) {
    store[seedSlot] = options.seedVersion;
    store[valueSlot] = options.seed();
    options.onReseed?.();
  }

  const value = store[valueSlot] as T;
  const kv = getKvStore();
  const external = getKvBackend() === 'redis';

  const mirror = (): void => {
    if (external) void kv.set(options.key, JSON.stringify(value));
  };

  if (external) {
    void kv.get(options.key).then((raw) => {
      if (raw == null) {
        mirror();
        return;
      }
      try {
        const parsed: unknown = JSON.parse(raw);
        if (options.accepts(parsed)) (options.apply ?? replaceInPlace)(value, parsed);
      } catch {
        /* 损坏数据忽略，保留内存种子 */
      }
    });
  }

  return { value, mirror };
}

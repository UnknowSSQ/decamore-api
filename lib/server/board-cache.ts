/** 榜单类上游的共同外壳：按键缓存一段时间，过期先回旧数据并让后台去刷新 */
import 'server-only';

import { logger } from './logger';
import { markCacheHit } from './trace';

interface Entry<TEntry> {
  at: number;
  value: TEntry;
}

interface BoardCacheConfig<TKey extends string, TEntry, TResult> {
  /** globalThis 上的槽位名，改名等于换一份缓存 */
  slot: string;
  /** 上游归一化后的裸数据；抛错即视为本次失败，不会写缓存 */
  fetch: (key: TKey) => Promise<TEntry>;
  /**
   * 把裸数据拼成对外结果。省略即用 passThrough：条目本身就带 cached 字段的接口
   * （wallpaper / exchange / gold / weather / typhoon 路径）不需要每个再写一遍铺开逻辑。
   */
  toResult?: (key: TKey, entry: TEntry, cached: boolean) => TResult;
}

/**
 * 过期后仍拿来先答一道的宽限量：一个 TTL，短榜再兜到不少于 10 分钟。
 * 按 TTL 的固定倍数会跑偏——热搜那 60 秒乘十是 10 分钟（合适），汇率那一小时乘十就成了
 * 把十小时前的牌价当现价供，而它文档承诺的是「一小时的缓存」。
 * 超过窗口就当没有缓存，回到阻塞取数：宁可慢或 503，也不把很久以前的榜当真。
 */
const STALE_GRACE_FLOOR_MS = 10 * 60_000;
/** 后台刷新失败后的重试间隔，与 `upstream.ts` 的失败冷却同档，免得宕机时每个请求都去撞一次 */
const REFRESH_BACKOFF_MS = 15_000;
/**
 * 缓存键的上限。大多数榜单的键是固定的几个平台 / 类型，但 `typhoon?id=` 这类
 * 是调用方给的任意编号——不设限就是每来一个新 id 永久留一份（一条路径 31KB）。
 * 超了就从最老的键开始丢：Map 保持插入顺序，被刷新的键会重新落到队尾。
 */
const MAX_TRACKED_KEYS = 64;

/** 带 cached 字段的结果对象在命中时把标记铺开；数组与其它形状原样返回 */
function passThrough<TEntry>(_key: string, entry: TEntry, cached: boolean): TEntry {
  if (cached && entry !== null && typeof entry === 'object' && !Array.isArray(entry) && 'cached' in entry) {
    return { ...(entry as object), cached: true } as TEntry;
  }
  return entry;
}

/**
 * 缓存、进行中的请求与刷新失败时刻都挂 globalThis：Next 按 route 分包，模块级变量每个
 * chunk 各存一份，榜单就会被缓存 N 次、single-flight 与后台刷新去重也只在 chunk 内成立。
 */
export function createBoardCache<TKey extends string, TEntry, TResult = TEntry>(
  config: BoardCacheConfig<TKey, TEntry, TResult> & { ttlMs: number },
): (key: TKey) => Promise<TResult> {
  const toResult = (config.toResult ?? passThrough) as (key: TKey, entry: TEntry, cached: boolean) => TResult;
  const store = globalThis as typeof globalThis & Record<string, unknown>;
  const entries = ((store[config.slot] ??= new Map<string, Entry<TEntry>>()) as Map<string, Entry<TEntry>>);
  const pending = ((store[`${config.slot}.inflight`] ??= new Map<string, Promise<TResult>>()) as Map<
    string,
    Promise<TResult>
  >);
  const failedAt = ((store[`${config.slot}.failedAt`] ??= new Map<string, number>()) as Map<string, number>);

  /** 真正去上游取一次；同键并发共用同一个 promise，所以后台刷新不会额外放大请求数 */
  function load(key: TKey, background: boolean): Promise<TResult> {
    const running = pending.get(key);
    if (running) return running;

    const task = (async () => {
      const value = await config.fetch(key);
      // 先删后插，把刚取到的键挪到队尾，淘汰时先丢的是最久没刷新的
      entries.delete(key);
      entries.set(key, { at: Date.now(), value });
      failedAt.delete(key);
      if (entries.size > MAX_TRACKED_KEYS) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined && oldest !== key) entries.delete(oldest);
      }
      return toResult(key, value, false);
    })().catch((error: unknown) => {
      if (background) {
        // 后台失败不影响正在被服务的旧数据，但必须留痕，还得记一笔避开重试
        failedAt.set(key, Date.now());
        logger.warn({
          event: 'board.refresh',
          message: `后台刷新缓存失败（${config.slot} / ${key}），暂时继续服务上一份数据`,
          error,
        });
      }
      throw error;
    }).finally(() => pending.delete(key));

    pending.set(key, task);
    return task;
  }

  return function resolve(key: TKey): Promise<TResult> {
    const hit = entries.get(key);
    if (hit) {
      const age = Date.now() - hit.at;
      if (age < config.ttlMs) {
        markCacheHit();
        return Promise.resolve(toResult(key, hit.value, true));
      }
      if (age < config.ttlMs + Math.max(config.ttlMs, STALE_GRACE_FLOOR_MS)) {
        markCacheHit();
        // 没有失败记录就照常刷新；有记录则要等过退避期
        const lastFailure = failedAt.get(key);
        if (lastFailure === undefined || Date.now() - lastFailure >= REFRESH_BACKOFF_MS) {
          void load(key, true).catch(() => undefined);
        }
        return Promise.resolve(toResult(key, hit.value, true));
      }
    }

    return load(key, false);
  };
}

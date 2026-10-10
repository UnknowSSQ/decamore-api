/** 榜单类上游的共同外壳：按键缓存一段时间，同键并发只打一次上游 */
import 'server-only';

interface Entry<TEntry> {
  at: number;
  value: TEntry;
}

export interface BoardCacheConfig<TKey extends string, TEntry, TResult> {
  /** globalThis 上的槽位名，改名等于换一份缓存 */
  slot: string;
  /** 上游归一化后的裸数据；抛错即视为本次失败，不会写缓存 */
  fetch: (key: TKey) => Promise<TEntry>;
  /** cached 标记这份结果来自缓存还是刚取的上游 */
  toResult: (key: TKey, entry: TEntry, cached: boolean) => TResult;
}

/**
 * 缓存与进行中的请求都挂 globalThis：Next 按 route 分包，模块级变量每个 chunk 各存一份，
 * 榜单就会被缓存 N 次、single-flight 也只在 chunk 内成立。
 */
export function createBoardCache<TKey extends string, TEntry, TResult>(
  config: BoardCacheConfig<TKey, TEntry, TResult> & { ttlMs: number },
): (key: TKey) => Promise<TResult> {
  const store = globalThis as typeof globalThis & Record<string, unknown>;
  const entries = ((store[config.slot] ??= new Map<string, Entry<TEntry>>()) as Map<string, Entry<TEntry>>);
  const pending = ((store[`${config.slot}.inflight`] ??= new Map<string, Promise<TResult>>()) as Map<
    string,
    Promise<TResult>
  >);

  return function resolve(key: TKey): Promise<TResult> {
    const hit = entries.get(key);
    if (hit && Date.now() - hit.at < config.ttlMs) return Promise.resolve(config.toResult(key, hit.value, true));

    const running = pending.get(key);
    if (running) return running;

    const task = (async () => {
      const value = await config.fetch(key);
      entries.set(key, { at: Date.now(), value });
      return config.toResult(key, value, false);
    })().finally(() => pending.delete(key));

    pending.set(key, task);
    return task;
  };
}

/**
 * 固定窗口计数：限流与访问规则共用一套桶。
 * 只有一种实现——窗口键走 KvStore，所以限额不再被实例数或 route chunk 数量放大。
 */
interface WindowDecision {
  allowed: boolean;
  /** 拒绝时距窗口重置的秒数 */
  retryAfterSec: number;
}

export interface WindowStore {
  tryConsume(key: string, limit: number, windowMs: number, nowMs: number): Promise<WindowDecision>;
}

/**
 * 窗口起点 = floor(now/windowMs)，每个窗口一个计数键，首次自增时由 KvStore 写入 windowMs 的过期，
 * 之后的命中不再改过期。多实例共享同一份计数键。
 */
export function createKvWindowStore(kv: {
  incr(key: string, ttlMs?: number): Promise<number>;
}): WindowStore {
  return {
    async tryConsume(key, limit, windowMs, nowMs) {
      const windowStart = Math.floor(nowMs / windowMs);
      const bucketKey = `rl:${key}:${windowStart}`;
      const count = await kv.incr(bucketKey, windowMs);

      if (count > limit) {
        const resetAt = (windowStart + 1) * windowMs;
        return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((resetAt - nowMs) / 1000)) };
      }
      return { allowed: true, retryAfterSec: 0 };
    },
  };
}

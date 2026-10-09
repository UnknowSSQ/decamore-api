/** 固定窗口计数：限流与访问规则共用一套桶，纯实现便于测试 */
export interface WindowDecision {
  allowed: boolean;
  /** 拒绝时距窗口重置的秒数 */
  retryAfterSec: number;
}

export interface WindowStore {
  tryConsume(key: string, limit: number, windowMs: number, nowMs: number): WindowDecision;
  size(): number;
  reset(): void;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/** buckets 可由调用方注入：route handler 会被分成多个 chunk，只有把 Map 挂在 globalThis 上限额才不会被 chunk 数量放大 */
export function createWindowStore(capacity = 5000, buckets: Map<string, Bucket> = new Map()): WindowStore {
  /** 桶只增不减会顶满内存，超过容量时顺带清掉已过期的键 */
  const purgeExpired = (nowMs: number): void => {
    for (const [key, value] of buckets) if (value.resetAt <= nowMs) buckets.delete(key);
  };

  return {
    tryConsume(key, limit, windowMs, nowMs) {
      const bucket = buckets.get(key);

      if (!bucket || bucket.resetAt <= nowMs) {
        buckets.set(key, { count: 1, resetAt: nowMs + windowMs });
      } else {
        bucket.count += 1;
        if (bucket.count > limit) {
          return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - nowMs) / 1000)) };
        }
      }

      if (buckets.size > capacity) purgeExpired(nowMs);
      return { allowed: true, retryAfterSec: 0 };
    },
    size: () => buckets.size,
    reset: () => buckets.clear(),
  };
}

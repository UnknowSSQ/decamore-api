/** 请求级上下文：整条链路共享 traceId 与时间，免得层层传参；Edge middleware 不支持 ALS，只能到 Route Handler 才建 */
import 'server-only';

import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

export interface RequestContext {
  traceId: string;
  /** performance.now() 单调时钟，算耗时用它 */
  startedAt: number;
  /** 墙上时钟，只用于日志展示 */
  startedAtMs: number;
  method: string;
  path: string;
  /** 路由模板，聚合统计用它避免高基数 */
  routePattern?: string;
  ip?: string;
  userAgent?: string;
  /** 鉴权成功后才回填 */
  userId?: string;
  role?: string;
  status?: number;
  errorCode?: number;
  /** 来自 content-length，可能取不到 */
  requestBytes?: number;
  /** 关掉本次请求的统计 */
  skipStats?: boolean;
}

const store = new AsyncLocalStorage<RequestContext>();

/** 时间戳前缀 + 随机段，便于按时间与人工检索 */
export function createTraceId(): string {
  const raw = randomUUID().replace(/-/g, '');
  return `${Date.now().toString(36)}-${raw.slice(0, 12)}`;
}

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return store.run(ctx, fn);
}

/** 非 API 调用场景为 undefined */
export function getRequestContext(): RequestContext | undefined {
  return store.getStore();
}

export function getTraceId(): string | undefined {
  return store.getStore()?.traceId;
}

/** 毫秒、两位小数；无上下文时返回 0 */
export function elapsedMs(): number {
  const ctx = store.getStore();
  if (!ctx) return 0;
  return Math.round((performance.now() - ctx.startedAt) * 100) / 100;
}

/** x-forwarded-for 取首段（多级代理），回退 x-real-ip；这些头可被伪造，风控不能只信它 */
export function resolveClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip') ?? headers.get('cf-connecting-ip') ?? '127.0.0.1';
}

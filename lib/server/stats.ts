/** 接口调用统计：结构化日志 + 内存环形缓冲，供控制台仪表盘与接口管理逐行指标取数 */
import 'server-only';

import { CALL_RING_CAPACITY } from '@/constants/app';
import { logger } from './logger';
import { elapsedMs, getRequestContext } from './trace';

export interface ApiCallRecord {
  accessedAt: string;
  accessedAtMs: number;
  method: string;
  /** pathname，不含 query */
  path: string;
  /** 路由模板，非真实 path */
  route: string;
  /** HTTP 状态码 */
  status: number;
  /** 业务码，即响应体 statusCode */
  errorCode: number;
  durationMs: number;
  ip: string;
  userAgent: string;
  userId?: string;
  role?: string;
  traceId: string;
  /** status < 400 */
  success: boolean;
  /** 出自服务端缓存时为 true；没有缓存语义的接口是 undefined，界面按「—」显示 */
  cacheHit?: boolean;
}

/** 挂 globalThis：每个 route chunk 各带一份 ring 时，routeCallStats 只能看见自己记下的那点调用 */
const globalStore = globalThis as typeof globalThis & { __decamoreCallRing?: ApiCallRecord[] };
const ring: ApiCallRecord[] = (globalStore.__decamoreCallRing ??= []);

/** 自身与健康检查不记账，避免自我放大 */
const SKIP_PATTERNS: RegExp[] = [/^\/api\/health/, /\/_next\//];

function shouldSkip(path: string): boolean {
  return SKIP_PATTERNS.some((re) => re.test(path));
}

/** 无请求上下文时静默跳过；overrides 是只有响应侧才确定的字段 */
export function recordApiCall(overrides: { status: number; errorCode: number }): void {
  try {
    const ctx = getRequestContext();
    if (!ctx) return;
    if (ctx.skipStats || shouldSkip(ctx.path)) return;

    const record: ApiCallRecord = {
      accessedAt: new Date(ctx.startedAtMs).toISOString(),
      accessedAtMs: ctx.startedAtMs,
      method: ctx.method,
      path: ctx.path,
      route: ctx.routePattern ?? ctx.path,
      status: overrides.status,
      errorCode: overrides.errorCode,
      durationMs: elapsedMs(),
      ip: ctx.ip ?? '-',
      userAgent: ctx.userAgent ?? '-',
      userId: ctx.userId,
      role: ctx.role,
      traceId: ctx.traceId,
      success: overrides.status < 400,
      cacheHit: ctx.cacheHit,
    };

    ring.push(record);
    if (ring.length > CALL_RING_CAPACITY) ring.shift();

    logger.info({
      event: 'api.call',
      message: `${record.method} ${record.route} -> ${record.status} (${record.durationMs}ms)`,
      meta: {
        status: record.status,
        errorCode: record.errorCode,
        durationMs: record.durationMs,
        userId: record.userId,
        success: record.success,
      },
    });
  } catch (err: unknown) {
    // 统计失败绝不影响业务响应
    logger.warn({ event: 'api.stats.error', message: '调用统计异常', error: err });
  }
}

/** 环形快照：控制台的日志页、仪表盘与报表共用，默认取全部留存记录 */
export function recentCalls(sinceMs = 0, untilMs = Number.POSITIVE_INFINITY): ApiCallRecord[] {
  return ring.filter((r) => r.accessedAtMs >= sinceMs && r.accessedAtMs < untilMs);
}

/** 按路由模板汇总近 24 小时的真实调用数；与仪表盘的分桶不同，不做 top N 截断，供接口管理逐行取数 */
export function routeCallStats(): Record<string, { count: number; avgDurationMs: number; errorCount: number }> {
  const sinceMs = Date.now() - 24 * 3600 * 1000;
  const acc = new Map<string, { count: number; sum: number; errors: number }>();
  for (const r of ring) {
    if (r.accessedAtMs < sinceMs) continue;
    const bucket = acc.get(r.route) ?? { count: 0, sum: 0, errors: 0 };
    bucket.count += 1;
    bucket.sum += r.durationMs;
    if (!r.success) bucket.errors += 1;
    acc.set(r.route, bucket);
  }

  const out: Record<string, { count: number; avgDurationMs: number; errorCount: number }> = {};
  for (const [route, v] of acc) {
    out[route] = { count: v.count, avgDurationMs: round(v.sum / v.count), errorCount: v.errors };
  }
  return out;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

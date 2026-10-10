/** 接口调用统计：结构化日志 + 内存环形缓冲，供控制台仪表盘与接口管理逐行指标取数 */
import 'server-only';

import { getServerEnv } from '@/env';
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
  /** 字节；取不到 content-length 时缺省 */
  requestBytes?: number;
  responseBytes?: number;
}

/** 只留最近 RING_CAPACITY 条，进程重启即清空 */
const RING_CAPACITY = 500;

/** 挂 globalThis：每个 route chunk 各带一份 ring 时，routeCallStats 只能看见自己记下的那点调用 */
const globalStore = globalThis as typeof globalThis & { __decamoreCallRing?: ApiCallRecord[] };
const ring: ApiCallRecord[] = (globalStore.__decamoreCallRing ??= []);

/** 自身与健康检查不记账，避免自我放大 */
const SKIP_PATTERNS: RegExp[] = [/^\/api\/health/, /\/_next\//];

function shouldSkip(path: string): boolean {
  return SKIP_PATTERNS.some((re) => re.test(path));
}

/** 无请求上下文时静默跳过；overrides 是只有响应侧才确定的字段 */
export function recordApiCall(overrides: {
  status: number;
  errorCode: number;
  responseBytes?: number;
}): void {
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
      requestBytes: ctx.requestBytes,
      responseBytes: overrides.responseBytes,
    };

    ring.push(record);
    if (ring.length > RING_CAPACITY) ring.shift();

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

    // 不 await，落库不能拖慢响应
    if (getServerEnv().API_STATS_PERSIST) {
      void persist(record).catch((err: unknown) => {
        logger.warn({ event: 'api.stats.persist_failed', message: '调用统计落库失败', error: err });
      });
    }
  } catch (err: unknown) {
    // 统计失败绝不影响业务响应
    logger.warn({ event: 'api.stats.error', message: '调用统计异常', error: err });
  }
}

async function persist(record: ApiCallRecord): Promise<void> {
  // 占位实现：除 debug 打点外不写任何存储
  logger.debug({ event: 'api.stats.persist_stub', meta: { traceId: record.traceId, route: record.route } });
}

/** 按路由模板汇总窗口内的真实调用数；与仪表盘的分桶不同，不做 top N 截断，供接口管理逐行取数 */
export function routeCallStats(sinceMs = Date.now() - 24 * 3600 * 1000): Record<string, { count: number; avgDurationMs: number; errorCount: number }> {
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

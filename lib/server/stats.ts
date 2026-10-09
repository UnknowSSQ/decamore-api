/** 接口调用统计：结构化日志 + 内存环形缓冲，供 /api/v1/stats 与控制台仪表盘取数 */
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

export interface ApiCallAggregate {
  total: number;
  successCount: number;
  errorCount: number;
  /** 0~1 的比例，不是百分数 */
  errorRate: number;
  avgDurationMs: number;
  p95DurationMs: number;
  byRoute: { route: string; count: number; avgDurationMs: number; errorCount: number }[];
  byStatusFamily: Record<string, number>;
}

/** 只留最近 RING_CAPACITY 条，进程重启即清空 */
const RING_CAPACITY = 500;
const ring: ApiCallRecord[] = [];

/** 统计接口自身与健康检查不记账，避免自我放大 */
const SKIP_PATTERNS: RegExp[] = [/^\/api\/v1\/stats/, /^\/api\/health/, /\/_next\//];

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

/** 只读到内存里最近 RING_CAPACITY 条，非全量 */
export function recentApiCalls(limit = 50): ApiCallRecord[] {
  return ring.slice(-Math.max(1, Math.min(limit, RING_CAPACITY)));
}

/** 基于内存环形缓冲聚合，进程重启后为空 */
export function aggregateApiCalls(sinceMs = Date.now() - 24 * 3600 * 1000): ApiCallAggregate {
  const list = ring.filter((r) => r.accessedAtMs >= sinceMs);
  const total = list.length;
  const successCount = list.filter((r) => r.success).length;
  const durations = list.map((r) => r.durationMs).sort((a, b) => a - b);

  const routeMap = new Map<string, { count: number; sum: number; errors: number }>();
  const familyMap: Record<string, number> = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };

  for (const r of list) {
    const bucket = routeMap.get(r.route) ?? { count: 0, sum: 0, errors: 0 };
    bucket.count += 1;
    bucket.sum += r.durationMs;
    if (!r.success) bucket.errors += 1;
    routeMap.set(r.route, bucket);

    const family = `${Math.floor(r.status / 100)}xx`;
    familyMap[family] = (familyMap[family] ?? 0) + 1;
  }

  const p95Index = Math.min(durations.length - 1, Math.floor(durations.length * 0.95));

  return {
    total,
    successCount,
    errorCount: total - successCount,
    errorRate: total === 0 ? 0 : round((total - successCount) / total),
    avgDurationMs: total === 0 ? 0 : round(list.reduce((s, r) => s + r.durationMs, 0) / total),
    p95DurationMs: durations.length ? (durations[p95Index] ?? 0) : 0,
    byRoute: [...routeMap.entries()]
      .map(([route, v]) => ({
        route,
        count: v.count,
        avgDurationMs: round(v.sum / v.count),
        errorCount: v.errors,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    byStatusFamily: familyMap,
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

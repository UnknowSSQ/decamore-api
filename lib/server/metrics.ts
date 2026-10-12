/**
 * 控制台取数的唯一入口：日志页、仪表盘、报表导出都从这里读同一份调用环形缓冲。
 * 数据来自本进程真实记录的 ApiCallRecord，没有记录就是 0 —— 不再用演示数字冒充流量。
 */
import 'server-only';

import type { CallLog, DashboardStats, DashboardTrendPoint, LogSummary } from '@/types';
import type { LogListQuery } from '@/lib/zod/admin.schema';
import { ipMatchesPattern } from '@/utils/net';
import type { RangeValue } from '@/lib/zod/common';
import { recentCalls, type ApiCallRecord } from './stats';

/** 区间秒数：仪表盘的时间 chip 与环形缓冲的取数窗口按它换算 */
const RANGE_SEC: Record<RangeValue, number> = { '24h': 24 * 3600, '7d': 7 * 24 * 3600, '30d': 30 * 24 * 3600 };
/** 趋势桶数：与旧的 24 / 7 / 30 点一致，AreaChart 的标签抽稀档位按它设计 */
const RANGE_BUCKETS: Record<RangeValue, number> = { '24h': 24, '7d': 7, '30d': 30 };

const ROUND_MS = (v: number): number => Math.round(v * 100) / 100;

function p95(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return Math.round(sorted[index] ?? 0);
}

function inWindow(record: ApiCallRecord, sinceMs: number, untilMs: number): boolean {
  return record.accessedAtMs >= sinceMs && record.accessedAtMs < untilMs;
}

/** 把一条记录摊成 CallLog：字段名与 types/domain 的契约一致，列定义才不用改 */
function toCallLog(record: ApiCallRecord): CallLog {
  return {
    id: record.traceId,
    time: record.accessedAt,
    path: record.path,
    method: record.method as CallLog['method'],
    status: record.status,
    latencyMs: record.durationMs,
    ip: record.ip,
    caller: record.userId ?? 'anonymous',
    ua: record.userAgent,
    cacheHit: record.cacheHit,
  };
}

/** 日志页的筛选、排序与分页；route 传的是 schema 校验过的完整对象，报表调用可以只给必要几项 */
export function queryCallLogs(query: Partial<LogListQuery>): { items: CallLog[]; summary: LogSummary } {
  const { page = 1, pageSize = 20, sort = 'time', order = 'desc' } = query;
  const comparators: Record<LogListQuery['sort'], (a: CallLog, b: CallLog) => number> = {
    time: (a, b) => Date.parse(a.time) - Date.parse(b.time),
    latency: (a, b) => a.latencyMs - b.latencyMs,
    status: (a, b) => a.status - b.status,
  };

  let items = recentCalls().map(toCallLog);

  if (query.keyword) {
    const kw = query.keyword.toLowerCase();
    items = items.filter(
      (log) =>
        log.path.toLowerCase().includes(kw) ||
        log.ip.includes(kw) ||
        log.caller.toLowerCase().includes(kw),
    );
  }
  if (query.path) items = items.filter((log) => log.path === query.path);
  if (query.method) items = items.filter((log) => log.method === query.method);
  if (query.status) items = items.filter((log) => log.status === query.status);
  if (query.statusFamily) {
    const prefix = query.statusFamily.replace('xx', '');
    items = items.filter((log) => String(log.status).startsWith(prefix));
  }
  // 后台允许填 CIDR，所以按网段匹配而不是字符串相等
  const ipFilter = query.ip;
  if (ipFilter) items = items.filter((log) => ipMatchesPattern(log.ip, ipFilter));
  if (query.cacheMissOnly) items = items.filter((log) => !log.cacheHit);
  if (query.from) {
    const fromMs = new Date(query.from.replace(' ', 'T')).getTime();
    items = items.filter((log) => Date.parse(log.time) >= fromMs);
  }
  if (query.to) {
    const toMs = new Date(query.to.replace(' ', 'T')).getTime();
    items = items.filter((log) => Date.parse(log.time) <= toMs);
  }

  const compare = comparators[sort] ?? comparators.time;
  items.sort((a, b) => (order === 'asc' ? compare(a, b) : -compare(a, b)));

  const latencies = items.map((log) => log.latencyMs);
  const summary = {
    total: items.length,
    errors: items.filter((log) => log.status >= 400).length,
    blocked: items.filter((log) => log.status === 429).length,
    avgLatencyMs: latencies.length > 0 ? ROUND_MS(latencies.reduce((s, v) => s + v, 0) / latencies.length) : 0,
    cacheHitRate:
      items.length > 0
        ? ROUND_MS((items.filter((log) => log.cacheHit === true).length / items.length) * 100)
        : 0,
  };

  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), summary };
}

/** 区间窗口内按桶聚合的调用数 / 错误数 / 平均耗时，趋势图与 KPI 迷你折线共用 */
function bucketize(records: ApiCallRecord[], sinceMs: number, spanMs: number, buckets: number): DashboardTrendPoint[] {
  const size = spanMs / buckets;
  const out: DashboardTrendPoint[] = [];

  for (let i = 0; i < buckets; i++) {
    const from = sinceMs + i * size;
    const to = from + size;
    const inBucket = records.filter((r) => inWindow(r, from, to));
    const errors = inBucket.filter((r) => !r.success).length;
    const avg =
      inBucket.length > 0
        ? Math.round(inBucket.reduce((sum, r) => sum + r.durationMs, 0) / inBucket.length)
        : 0;
    out.push({ label: bucketLabel(from, buckets), calls: inBucket.length, errors, avgLatencyMs: avg });
  }

  return out;
}

/** 24 小时的桶标到点，按天的桶标月-日 */
function bucketLabel(bucketStartMs: number, buckets: number): string {
  const d = new Date(bucketStartMs);
  if (buckets === 24) return `${d.getHours()}:00`;
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface DashboardTotals {
  calls: number;
  errorRate: number;
  p95LatencyMs: number;
  uniqueIps: number;
}

function totals(records: ApiCallRecord[]): DashboardTotals {
  const errors = records.filter((r) => !r.success).length;
  return {
    calls: records.length,
    errorRate: records.length > 0 ? ROUND_MS((errors / records.length) * 100) : 0,
    p95LatencyMs: p95(records.map((r) => r.durationMs)),
    uniqueIps: new Set(records.map((r) => r.ip)).size,
  };
}

/**
 * 仪表盘的一屏数字。区间是「现在往回 N」，delta 与前一等长区间相比；
 * 环形缓冲只留最近 CALL_RING_CAPACITY 条，所以长区间的数字受缓冲上限约束（宁少报也不编）。
 */
export function getDashboardStats(range: RangeValue): DashboardStats {
  const now = Date.now();
  const spanMs = RANGE_SEC[range] * 1000;
  const since = now - spanMs;
  const allRecords = recentCalls();
  const records = recentCalls(since);
  // 缓冲里存在比窗口起点更旧的记录 ⇒ 窗口早期被挤出，长区间数字不完整
  const sampledCapped = records.length < allRecords.length;
  const previous = recentCalls(since - spanMs, since);

  const current = totals(records);
  const prior = totals(previous);

  const byStatus = new Map<string, number>();
  const byRoute = new Map<string, number>();
  for (const r of records) {
    const family = `${Math.floor(r.status / 100)}xx`;
    byStatus.set(family, (byStatus.get(family) ?? 0) + 1);
    byRoute.set(r.route, (byRoute.get(r.route) ?? 0) + 1);
  }

  const statusMix = [...byStatus.entries()]
    .map(([code, count]) => ({ code, count, ratio: ROUND_MS((count / records.length) * 100) }))
    .sort((a, b) => b.count - a.count);

  const topApis = [...byRoute.entries()]
    .map(([path, calls]) => ({ path, calls, share: ROUND_MS((calls / records.length) * 100) }))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 6);

  return {
    range,
    calls: current.calls,
    callsDelta: prior.calls === 0 ? 0 : ROUND_MS(((current.calls - prior.calls) / prior.calls) * 100),
    errorRate: current.errorRate,
    errorRateDelta: ROUND_MS(current.errorRate - prior.errorRate),
    p95LatencyMs: current.p95LatencyMs,
    p95LatencyDeltaMs: current.p95LatencyMs - prior.p95LatencyMs,
    uniqueIps: current.uniqueIps,
    sampled: records.length,
    sampledCapped,
    trend: bucketize(records, since, spanMs, RANGE_BUCKETS[range]),
    statusMix,
    topApis,
  };
}

/** 报表导出用的扁平表：与仪表盘同源，避免「页面一套数、导出另一套数」 */
export function reportTables(range: RangeValue) {
  const stats = getDashboardStats(range);
  const logs = queryCallLogs({ page: 1, pageSize: 500, sort: 'time', order: 'desc' }).items;

  return {
    stats,
    trend: stats.trend.map((p) => [p.label, p.calls, p.errors, p.avgLatencyMs]),
    statusMix: stats.statusMix.map((s) => [s.code, s.count, s.ratio]),
    topApis: stats.topApis.map((s) => [s.path, s.calls, s.share]),
    logs: logs.map((log) => [log.time, log.path, log.method, log.status, log.latencyMs, log.ip, log.caller]),
  };
}

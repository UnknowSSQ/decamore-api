import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { recordApiCall } from '@/lib/server/stats';
import { getDashboardStats, queryCallLogs } from '@/lib/server/metrics';
import { runWithRequestContext, type RequestContext } from '@/lib/server/trace';

/**
 * 环形缓冲没有注入口，就用真实链路喂数据：runWithRequestContext + recordApiCall
 * 与 withApiHandler 结束时写记录的路径完全一致，测的就是生产会算出来的东西。
 */
let seq = 0;

interface Seed {
  path: string;
  status: number;
  durationMs: number;
  ip: string;
  /** 距今多少毫秒，负数表示过去 */
  agoMs: number;
  userId?: string;
  cacheHit?: boolean;
}

function seedCalls(records: Seed[]): void {
  const now = Date.now();
  for (const r of records) {
    seq += 1;
    const startedAtMs = now - r.agoMs;
    const ctx: RequestContext = {
      traceId: `seed-${seq}`,
      // elapsedMs 用单调时钟做差，把 startedAt 往前推 durationMs 就得到目标耗时
      startedAt: performance.now() - r.durationMs,
      startedAtMs,
      method: 'GET',
      path: r.path,
      routePattern: r.path,
      ip: r.ip,
      userAgent: 'node-test',
      cacheHit: r.cacheHit,
    };
    if (r.userId) ctx.userId = r.userId;
    runWithRequestContext(ctx, () => recordApiCall({ status: r.status, errorCode: r.status }));
  }
}

const SCENARIO: Seed[] = [
  { path: '/api/v1/metric-a', status: 200, durationMs: 10, ip: '203.0.113.1', agoMs: 60_000, cacheHit: true },
  { path: '/api/v1/metric-a', status: 200, durationMs: 20, ip: '203.0.113.2', agoMs: 120_000, cacheHit: false },
  { path: '/api/v1/metric-b', status: 429, durationMs: 30, ip: '203.0.113.2', agoMs: 180_000 },
  { path: '/api/v1/metric-b', status: 500, durationMs: 40, ip: '203.0.113.3', agoMs: 240_000, userId: 'usr_001' },
  { path: '/api/v1/metric-c', status: 200, durationMs: 200, ip: '203.0.113.3', agoMs: 300_000, cacheHit: true },
];

describe('控制台取数走真实环形缓冲', () => {
  seedCalls(SCENARIO);

  it('日志按路径筛出子集，summary 与筛选同口径而不是当前页', () => {
    const { items, summary } = queryCallLogs({ path: '/api/v1/metric-b', page: 1, pageSize: 20 });
    assert.equal(items.length, 2);
    assert.equal(summary.total, 2);
    assert.equal(summary.errors, 2);
    assert.equal(summary.blocked, 1, '只有 429 记成拦截');
    // 耗时经 elapsedMs() 真实做差，比种子值多出亚毫秒级调度开销，按区间断言
    assert.ok(Math.abs(summary.avgLatencyMs - 35) < 5, `平均耗时应在 35ms 附近，实际 ${summary.avgLatencyMs}`);
    assert.equal(summary.cacheHitRate, 0, '这两条没有缓存命中');
  });

  it('keyword 命中路径、IP 与调用方，caller 来自会话而不是编造', () => {
    assert.equal(queryCallLogs({ keyword: 'metric-c' }).items.length, 1);
    assert.equal(queryCallLogs({ keyword: '203.0.113.1' }).items.length, 1);
    const byUser = queryCallLogs({ keyword: 'usr_001' });
    assert.equal(byUser.items.length, 1);
    assert.equal(byUser.items[0]?.caller, 'usr_001');
    assert.equal(queryCallLogs({ path: '/api/v1/metric-a' }).items[0]?.caller, 'anonymous');
  });

  it('ip 过滤认 CIDR，与后台黑白名单同一套口径', () => {
    assert.equal(queryCallLogs({ ip: '203.0.113.0/24' }).items.length, SCENARIO.length);
    assert.equal(queryCallLogs({ ip: '198.51.100.7' }).items.length, 0);
  });

  it('cacheMissOnly 只排除真正报 MISS 的记录，没有缓存语义的留在结果里', () => {
    const misses = queryCallLogs({ cacheMissOnly: true }).items;
    assert.ok(misses.some((log) => log.cacheHit === undefined), 'undefined 不该被当成命中');
    assert.ok(!misses.some((log) => log.cacheHit === true));
  });

  it('statusFamily 与排序各自生效，排序方向由 order 决定', () => {
    const family = queryCallLogs({ statusFamily: '4xx' });
    assert.deepEqual(family.items.map((l) => l.status), [429]);
    const asc = queryCallLogs({ sort: 'latency', order: 'asc', pageSize: 100 });
    const desc = queryCallLogs({ sort: 'latency', order: 'desc', pageSize: 100 });
    assert.ok((asc.items[0]?.latencyMs ?? 0) < (asc.items[1]?.latencyMs ?? 0), '升序首两条要递增');
    assert.ok((desc.items[0]?.latencyMs ?? 0) > (desc.items[1]?.latencyMs ?? 0), '降序首两条要递减');
    assert.equal(asc.items[0]?.path, '/api/v1/metric-a', '最快的是 10ms 那条');
    assert.equal(desc.items[0]?.path, '/api/v1/metric-c', '最慢的是 200ms 那条');
  });

  it('分页切在 summary 之后：页大小改变条目数但不改变总数口径', () => {
    const first = queryCallLogs({ page: 1, pageSize: 2 });
    const second = queryCallLogs({ page: 2, pageSize: 2 });
    assert.equal(first.items.length, 2);
    assert.equal(second.items.length, 2);
    assert.ok(first.summary.total >= SCENARIO.length);
    assert.notDeepEqual(
      first.items.map((l) => l.id),
      second.items.map((l) => l.id),
    );
  });

  it('仪表盘数字来自这批记录：调用量、独立 IP 与趋势桶合计一致', () => {
    const stats = getDashboardStats('24h');
    assert.equal(stats.calls, SCENARIO.length, '本进程的环形缓冲里就只有这些种子记录');
    assert.equal(stats.uniqueIps, new Set(SCENARIO.map((s) => s.ip)).size);
    assert.equal(stats.trend.length, 24, '24h 给 24 个桶');
    assert.equal(
      stats.trend.reduce((sum, p) => sum + p.calls, 0),
      stats.calls,
      '趋势桶合计必须等于区间总量',
    );
    assert.ok(
      stats.topApis.some((api) => api.path === '/api/v1/metric-a'),
      '种子路由要出现在 TOP 榜里',
    );
    assert.ok(
      stats.statusMix.some((mix) => mix.code === '4xx' && mix.count >= 1),
      '429 要归进 4xx 家族',
    );
  });

  it('错误率与 P95 是算出来的，不是写死的常量', () => {
    const stats = getDashboardStats('24h');
    const expectedRate = Math.round((SCENARIO.filter((s) => s.status >= 400).length / SCENARIO.length) * 10_000) / 100;
    assert.equal(stats.errorRate, expectedRate);
    // 5 条里最慢的是 200ms，95 分位取到它（同样允许亚毫秒漂移）
    assert.ok(Math.abs(stats.p95LatencyMs - 200) < 5, `P95 应贴近 200ms，实际 ${stats.p95LatencyMs}`);
  });

  it('区间窗口按「天」换算：7d 吞 2 天前、吐 8 天前（锁死 7*3600 回退 bug）', () => {
    // 两条探针：一条落在 7d 内（2 天前），一条落在 7d 外（8 天前）
    seedCalls([
      { path: '/api/v1/range-probe', status: 200, durationMs: 1, ip: '198.51.100.20', agoMs: 2 * 24 * 3600 * 1000 },
      { path: '/api/v1/range-probe', status: 200, durationMs: 1, ip: '198.51.100.21', agoMs: 8 * 24 * 3600 * 1000 },
    ]);

    const calls24 = getDashboardStats('24h').calls;
    const stats7 = getDashboardStats('7d');
    const stats30 = getDashboardStats('30d');

    // 24h 不含这两条探针（均早于 24h）
    // 7d 只多吞下 2 天前的那条
    assert.equal(stats7.calls, calls24 + 1, '7d 窗口应比 24h 多 1 条（2 天前的记录）');
    // 30d 再吞下 8 天前的那条
    assert.equal(stats30.calls, calls24 + 2, '30d 窗口应比 24h 多 2 条');
    // 回归防线：若 7d 被错算成 7 小时，stats7.calls 会等于 calls24，上面的断言直接失败

    // 8 天前的探针落在 7d 窗口之外、但仍留在缓冲里 ⇒ 7d 被截断，30d 未截断
    assert.equal(stats7.sampledCapped, true, '缓冲含窗口外的记录时 7d 应标记截断');
    assert.equal(stats30.sampledCapped, false, '30d 窗口覆盖全部探针，不应标记截断');
  });
});

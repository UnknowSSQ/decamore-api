/** 仪表盘数字全部硬编码，trend 按下标用 sin 派生 */
import 'server-only';

import type { DashboardStats } from '@/types';

export function buildDashboardStats(range: '24h' | '7d' | '30d'): DashboardStats {
  const points = range === '24h' ? 24 : range === '7d' ? 7 : 30;
  const trend = Array.from({ length: points }, (_, i) => ({
    label: range === '24h' ? `${i}:00` : `${i + 1}`,
    value: 1200 + Math.floor(Math.sin(i / 3) * 300 + i * 50),
  }));

  return {
    callsToday: 28456,
    callsDelta: 12.5,
    errorRate: 2.3,
    errorRateDelta: -0.8,
    p95LatencyMs: 127,
    activeKeys: 42,
    trend,
    statusMix: [
      { code: '200', count: 27123, ratio: 95.3 },
      { code: '400', count: 284, ratio: 1.0 },
      { code: '404', count: 426, ratio: 1.5 },
      { code: '429', count: 342, ratio: 1.2 },
      { code: '500', count: 281, ratio: 1.0 },
    ],
    topApis: [
      { path: '/api/v1/hitokoto', calls: 4521, share: 15.9 },
      { path: '/api/v1/wallpaper', calls: 3842, share: 13.5 },
      { path: '/api/v1/hotsearch', calls: 2956, share: 10.4 },
      { path: '/api/v1/hotmusic', calls: 2134, share: 7.5 },
      { path: '/api/v1/hotplay', calls: 1876, share: 6.6 },
    ],
    health: [
      { name: 'API 网关', uptime: 99.98, status: 'ok' },
      { name: '数据库', uptime: 99.95, status: 'ok' },
      { name: '缓存服务', uptime: 99.99, status: 'ok' },
      { name: '日志系统', uptime: 98.2, status: 'warn' },
    ],
    activities: [
      {
        time: '2026-10-07T02:15:00.000Z',
        actor: 'Admin',
        action: '登录',
        target: '系统',
        tone: 'ok',
      },
      {
        time: '2026-10-07T01:00:00.000Z',
        actor: '系统',
        action: '更新规则',
        target: '热点接口频控',
        tone: 'warn',
      },
      {
        time: '2026-10-06T22:30:00.000Z',
        actor: '系统',
        action: '拦截异常',
        target: '198.51.100.42',
        tone: 'danger',
      },
      {
        time: '2026-10-06T18:00:00.000Z',
        actor: 'Admin',
        action: '创建接口',
        target: '/api/v1/hotchart',
        tone: 'ok',
      },
    ],
  };
}

export function getDashboardStats(range: '24h' | '7d' | '30d'): DashboardStats {
  return buildDashboardStats(range);
}

'use client';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { EmptyState, Kicker, Panel, PanelTitle, Skeleton } from '@/components/ui/Panel';
import { Segmented } from '@/components/ui/Tabs';
import { AreaChart, type AreaChartPoint } from '@/components/console/charts/AreaChart';
import { BarList } from '@/components/console/charts/BarList';
import { DonutChart } from '@/components/console/charts/DonutChart';
import { KpiCard } from './KpiCard';
import { usePolling, useRequest } from '@/hooks/useRequest';
import { useToast } from '@/hooks/useToast';
import { exportReport, fetchDashboard } from '@/lib/api';
import { formatCompactCn, formatLongDate, formatNumber } from '@/utils/format';
import { useNow } from '@/hooks/useUi';
import type { RangeValue } from '@/lib/zod/common';

/** key / deltaKey 直接索引 DashboardStats，加卡片只改这张表 */
const KPI_CONFIG = [
  {
    label: '今日调用总量',
    key: 'callsToday' as const,
    deltaKey: 'callsDelta' as const,
    deltaLabel: 'vs 上周同期',
    footnote: '24h 累计请求',
    sparkColor: '#365b49',
    sparkSeed: 11,
    format: 'number' as const,
  },
  {
    label: '错误率',
    key: 'errorRate' as const,
    deltaKey: 'errorRateDelta' as const,
    deltaLabel: '目标 < 1.0%',
    footnote: '4xx + 5xx 占比',
    sparkColor: '#c2864f',
    sparkSeed: 22,
    format: 'percent' as const,
  },
  {
    label: '平均响应延迟',
    key: 'p95LatencyMs' as const,
    deltaKey: 'errorRateDelta' as const, // 复用字段，实际应独立
    deltaLabel: 'P95 · 142ms',
    footnote: '全站平均耗时',
    sparkColor: '#8aa68f',
    sparkSeed: 33,
    format: 'ms' as const,
  },
  {
    label: '独立调用方',
    key: 'activeKeys' as const,
    deltaKey: 'callsDelta' as const, // 复用字段，实际应独立
    deltaLabel: '24h 独立 IP · 免密钥直调',
    footnote: '活跃应用数',
    sparkColor: '#8aa68f',
    sparkSeed: 44,
    format: 'number' as const,
  },
];

/** 环形图按数组顺序顺时针铺，第一段决定圆心的占比数字 */
const STATUS_CODE_SEGMENTS = [
  { label: '200 · 成功', value: 1211000, color: '#365b49' },
  { label: '301 · 重定向', value: 27000, color: '#7d9884' },
  { label: '404 · 未找到', value: 20500, color: '#c2a36f' },
  { label: '429 · 限流拦截', value: 18000, color: '#cf8b52' },
  { label: '5xx · 服务错误', value: 9000, color: '#b3512f' },
];

/** 和下方「迷你统计」不同源：这份固定，迷你统计用 data.health */
const HEALTH_COMPONENTS = [
  { name: '边缘网关', location: 'cn-east · 4 节点', uptime: 99.98, status: 'ok' as const },
  { name: '鉴权服务', location: 'cn-east · 2 节点', uptime: 99.95, status: 'ok' as const },
  { name: '计量与配额', location: 'cn-east · 3 节点', uptime: 99.91, status: 'warn' as const },
  { name: '对象存储', location: '双活 · 2 区域', uptime: 100.0, status: 'ok' as const },
];

const TIMELINE_EVENTS = [
  {
    tone: 'ok' as const,
    title: '规则「热点接口频控」阈值调整为 45 次/分钟 · 单 IP',
    description: '操作者 admin@decamore.dev · 规则变更',
    time: '09:42',
  },
  {
    tone: 'ok' as const,
    title: '接口 /api/v1/hotsearch 升级至 v2.1.0',
    description: '响应结构无变化，文档已同步更新',
    time: '09:18',
  },
  {
    tone: 'danger' as const,
    title: '拦截高频异常请求',
    description: '45.128.88.12 触发限流规则，已自动加入黑名单',
    time: '08:56',
  },
  {
    tone: 'warn' as const,
    title: '/api/v1/hotmusic 上游数据源切换完成',
    description: '数据延迟降低 40%，历史接口兼容',
    time: '08:30',
  },
  {
    tone: 'ok' as const,
    title: '维护模式已关闭',
    description: '例行维护 02:00–02:40 顺利完成，无工单',
    time: '昨天 02:41',
  },
];

const CATEGORY_TRAFFIC = [
  { label: '内容', value: 412000 },
  { label: '工具', value: 386000 },
  { label: '数据', value: 312000 },
  { label: '图片', value: 174000 },
];

export function DashboardView({ autoRefreshSec = 30 }: { autoRefreshSec?: number }) {
  const [range, setRange] = useState<RangeValue>('24h');
  const toast = useToast();
  const { now, ready } = useNow();

  // fetcher 保持稳定，run 才不会被每次渲染换掉，下面的 effect 才敢把它写进依赖
  const fetchRange = useCallback((next: RangeValue) => fetchDashboard(next), []);
  const { data, loading, error, run, refetch } = useRequest(fetchRange);

  // 只 setRange 不发请求的话，新区间要等下一次轮询才拿到，关掉自动刷新就永远停在旧区间
  useEffect(() => {
    void run(range);
  }, [range, run]);

  // 轮询间隔来自后台「站点设置 · 自动刷新」，0 或小于 1 秒视为关闭
  usePolling(refetch, Math.max(0, autoRefreshSec) * 1000);

  const handleExport = async () => {
    try {
      await exportReport({ range, format: 'csv' });
      toast.success('仪表盘报表已生成，正在下载…', '【待开发】真实下载直链');
    } catch {
      toast.error('导出失败');
    }
  };

  // 点数随 range 变（24/7/30），标签抽稀由 AreaChart 负责
  const trendData: AreaChartPoint[] = data?.trend ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Kicker>Overview</Kicker>
          <h1 className="text-[19px] font-semibold text-ink">仪表盘</h1>
          <p className="flex items-center gap-2 text-[12.5px] text-muted">
            <span className="pulse-dot" aria-hidden />
            {ready ? formatLongDate(now) : '加载中'}
            <span>·</span>
            <span>{autoRefreshSec >= 1 ? `数据每 ${autoRefreshSec} 秒自动刷新` : '自动刷新已关闭'}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Segmented
            options={[
              { value: '24h', label: '24h' },
              { value: '7d', label: '7d' },
              { value: '30d', label: '30d' },
            ]}
            value={range}
            onChange={setRange}
            ariaLabel="时间范围"
          />
          <Button variant="outline" size="sm" onClick={handleExport} trailing="↗">
            导出报表
          </Button>
        </div>
      </header>

      {error && (
        <EmptyState
          mark="⚠"
          title="数据加载失败"
          description={error.message}
          action={
            <Button variant="primary" onClick={refetch}>
              重试
            </Button>
          }
        />
      )}

      {loading && !data && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-sm:grid-cols-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-sm:grid-cols-1">
            {KPI_CONFIG.map((config) => (
              <KpiCard
                key={config.label}
                label={config.label}
                value={data[config.key]}
                delta={data[config.deltaKey]}
                deltaLabel={config.deltaLabel}
                footnote={config.footnote}
                sparkColor={config.sparkColor}
                sparkSeed={config.sparkSeed}
                format={config.format}
              />
            ))}
          </div>

          <div className="grid grid-cols-[1.9fr_1fr] gap-4 max-lg:grid-cols-1">
            <Panel>
              <PanelTitle
                title="调用量趋势"
                description="全站 GET / POST 请求总量 · 含缓存命中"
                extra={
                  <div className="flex items-center gap-4 text-[11.5px]">
                    <span>
                      区间合计{' '}
                      <strong className="font-mono text-ink">
                        {formatNumber(trendData.reduce((s, p) => s + p.value, 0))}
                      </strong>
                    </span>
                    <span>
                      均值{' '}
                      <strong className="font-mono text-ink">
                        {formatCompactCn(
                          trendData.length > 0
                            ? trendData.reduce((s, p) => s + p.value, 0) / trendData.length
                            : 0,
                        )}
                      </strong>
                    </span>
                  </div>
                }
              />
              <div className="mt-4">
                <AreaChart data={trendData} height={258} />
              </div>
            </Panel>

            <Panel>
              <PanelTitle title="状态码分布" description="今日返回码占比" />
              <div className="mt-4">
                <DonutChart segments={STATUS_CODE_SEGMENTS} />
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-[1.55fr_1fr] gap-4 max-lg:grid-cols-1">
            <Panel>
              <PanelTitle title="热门接口 TOP 6" description="24h 调用量排行" />
              <div className="mt-4">
                <BarList
                  items={data.topApis.slice(0, 6).map((api) => ({
                    label: api.path,
                    value: api.calls,
                  }))}
                />
              </div>
            </Panel>

            <Panel>
              <PanelTitle title="服务健康" description="核心组件 90 天可用性" />
              <div className="mt-4 flex flex-col gap-3">
                {HEALTH_COMPONENTS.map((comp) => (
                  <div key={comp.name} className="flex items-center gap-3">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        comp.status === 'warn' ? 'bg-warn animate-pulse' : 'bg-ok'
                      }`}
                      aria-hidden
                    />
                    <div className="flex-1">
                      <p className="text-[12.5px] font-medium text-ink">{comp.name}</p>
                      <p className="text-[10.5px] text-muted">{comp.location}</p>
                    </div>
                    <span className="font-mono text-[12px] text-ink">{comp.uptime.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
            <Panel>
              <PanelTitle title="分类调用量" description="24h 各分类请求总量" />
              <div className="mt-4">
                <BarList items={CATEGORY_TRAFFIC} formatValue={formatCompactCn} />
              </div>
            </Panel>

            <Panel>
              <PanelTitle title="最近动态" description="管理员操作与系统事件" />
              <div className="mt-4 flex flex-col gap-3">
                {TIMELINE_EVENTS.map((event, i) => (
                  <div key={i} className="flex gap-3">
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        event.tone === 'danger'
                          ? 'bg-danger'
                          : event.tone === 'warn'
                            ? 'bg-warn'
                            : 'bg-ok'
                      }`}
                      aria-hidden
                    />
                    <div className="flex-1">
                      <p className="text-[12.5px] font-medium text-ink">{event.title}</p>
                      <p className="text-[10.5px] text-muted">{event.description}</p>
                    </div>
                    <time className="shrink-0 text-[10.5px] text-muted">{event.time}</time>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-sm:grid-cols-1">
            {data.health.slice(0, 4).map((item) => (
              <Panel key={item.name} className="text-center">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted">
                  {item.name}
                </p>
                <p className="mt-2 font-mono text-[24px] font-bold text-ink">
                  {item.uptime.toFixed(2)}%
                </p>
                <p
                  className={`mt-1 text-[11px] ${
                    item.status === 'warn' ? 'text-warn' : item.status === 'down' ? 'text-danger' : 'text-ok'
                  }`}
                >
                  {item.status === 'ok' ? '正常' : item.status === 'warn' ? '警告' : '故障'}
                </p>
              </Panel>
            ))}
          </div>

          <p className="text-center text-[11px] text-muted">
            数据更新于 {ready ? formatLongDate(now) : '--'} · 控制台 v2.6.0 · region cn-east
          </p>
        </>
      )}
    </div>
  );
}

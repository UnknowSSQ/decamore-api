'use client';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { EmptyState, Panel, PanelTitle, Skeleton } from '@/components/ui/Panel';
import { Segmented } from '@/components/ui/Tabs';
import { AreaChart, type AreaChartPoint } from '@/components/console/charts/AreaChart';
import { BarList } from '@/components/console/charts/BarList';
import { DonutChart, type DonutSegment } from '@/components/console/charts/DonutChart';
import { KpiCard } from './KpiCard';
import { usePolling, useRequest } from '@/hooks/useRequest';
import { useSiteFormat } from '@/hooks/useSiteFormat';
import { useToast } from '@/hooks/useToast';
import { exportReport, fetchDashboard } from '@/lib/api';
import { formatCompactCn, formatNumber } from '@/utils/format';
import { CALL_RING_CAPACITY, STATUS_FAMILY_COLORS } from '@/constants/app';
import { useNow } from '@/hooks/useUi';
import { rangeSchema, type RangeValue } from '@/lib/zod/common';

export function DashboardView({ autoRefreshSec = 30 }: { autoRefreshSec?: number }) {
  const { fmtLongDate } = useSiteFormat();
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
      const report = await exportReport({ range, format: 'csv' });
      // BOM 是给 Excel 的：没有它 UTF-8 的中文列会被按 GBK 解码成乱码
      const blob = new Blob([report.format === 'csv' ? `﻿${report.content}` : report.content], {
        type: report.format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json',
      });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = report.fileName;
      link.click();
      URL.revokeObjectURL(href);
      toast.success(`已导出 ${report.rows} 行`, report.fileName);
    } catch {
      toast.error('导出失败');
    }
  };

  const trendData: AreaChartPoint[] = (data?.trend ?? []).map((p) => ({ label: p.label, value: p.calls }));
  const statusSegments: DonutSegment[] = (data?.statusMix ?? []).map((s) => ({
    label: `${s.code} · ${s.count}`,
    value: s.count,
    color: STATUS_FAMILY_COLORS[s.code] ?? '#8aa68f',
  }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="kicker kicker--line">Overview</p>
          <h1 className="text-[19px] font-semibold text-ink">仪表盘</h1>
          <p className="flex items-center gap-2 text-[12.5px] text-muted">
            <span className="pulse-dot" aria-hidden />
            {ready ? fmtLongDate(now) : '加载中'}
            <span>·</span>
            <span>{autoRefreshSec >= 1 ? `数据每 ${autoRefreshSec} 秒自动刷新` : '自动刷新已关闭'}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Segmented
            options={rangeSchema.options.map((value) => ({ value, label: value }))}
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
            <KpiCard
              label="区间调用量"
              value={data.calls}
              delta={data.callsDelta}
              deltaLabel="vs 前一等长区间"
              footnote={
                data.sampledCapped
                  ? `${data.sampled} 条采样·内存环形缓冲已溢出，长区间仅覆盖最近保留的调用`
                  : `${data.sampled} 条采样记录`
              }
              series={data.trend.map((p) => p.calls)}
              format="number"
            />
            <KpiCard
              label="错误率"
              value={data.errorRate}
              delta={data.errorRateDelta}
              deltaLabel="vs 前一区间"
              footnote="4xx + 5xx 占比"
              series={data.trend.map((p) => p.errors)}
              lowerIsBetter
              format="percent"
            />
            <KpiCard
              label="P95 响应耗时"
              value={data.p95LatencyMs}
              delta={data.p95LatencyDeltaMs}
              deltaLabel="vs 前一区间"
              footnote="区间内 95 分位"
              series={data.trend.map((p) => p.avgLatencyMs)}
              lowerIsBetter
              format="ms"
            />
            <KpiCard
              label="独立来源 IP"
              value={data.uniqueIps}
              footnote="区间内去重后的客户端数"
              format="number"
            />
          </div>

          <div className="grid grid-cols-[1.9fr_1fr] gap-4 max-lg:grid-cols-1">
            <Panel>
              <PanelTitle
                title="调用量趋势"
                description="本进程记录的请求总量，按区间等分桶"
                extra={
                  <div className="flex items-center gap-4 text-[11.5px]">
                    <span>
                      区间合计{' '}
                      <strong className="font-mono text-ink">
                        {formatNumber(trendData.reduce((s, p) => s + p.value, 0))}
                      </strong>
                    </span>
                    <span>
                      每桶均值{' '}
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
                <AreaChart data={trendData} />
              </div>
            </Panel>

            <Panel>
              <PanelTitle
                title="状态码分布"
                description={data.calls > 0 ? `区间内 ${data.calls} 次请求` : '区间内还没有记录'}
              />
              <div className="mt-4">
                {statusSegments.length > 0 ? (
                  <DonutChart segments={statusSegments} />
                ) : (
                  <p className="py-10 text-center text-[12.5px] text-muted">还没有请求进来，等一会儿再看。</p>
                )}
              </div>
            </Panel>
          </div>

          <Panel>
            <PanelTitle
              title={`热门接口 TOP ${data.topApis.length}`}
              description="按路由模板统计区间内的调用次数"
            />
            <div className="mt-4">
              {data.topApis.length > 0 ? (
                <BarList items={data.topApis.map((api) => ({ label: api.path, value: api.calls }))} />
              ) : (
                <p className="py-8 text-center text-[12.5px] text-muted">区间内没有观测到调用。</p>
              )}
            </div>
          </Panel>

          <p className="text-center text-[11px] text-muted">
            数据来自本进程的调用环形缓冲（最近 {CALL_RING_CAPACITY} 条），进程重启后重新累计 · 更新于
            {ready ? ` ${fmtLongDate(now)}` : ' —'}
          </p>
        </>
      )}
    </div>
  );
}

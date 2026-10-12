'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { Badge, MethodBadge, Button, Icon, Input, Panel, PageHeader, Skeleton, Tooltip } from '@/components/ui';
import { DataTable, Pagination } from '@/components/ui/DataTable';
import { Switch } from '@/components/ui/Input';
import { useListQuery } from '@/hooks/useListQuery';
import { usePolling } from '@/hooks/useRequest';
import { useSiteFormat } from '@/hooks/useSiteFormat';
import { fetchLogs } from '@/lib/api';
import { CALL_RING_CAPACITY } from '@/constants/app';
import { formatDuration, formatNumber, formatPercent } from '@/utils/format';
import type { CallLog, CallLogPage, TableColumn } from '@/types';
import { StatusBars } from './StatusBars';
import { LogDetailDrawer } from './LogDetailDrawer';

const STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: '2xx', label: '2xx' },
  { value: '4xx', label: '4xx' },
  { value: '5xx', label: '5xx' },
  { value: '429', label: '仅 429' },
];

const METHOD_OPTIONS = [
  { value: 'all', label: '全部方法' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
];

/** 复用 fetchLogs 的入参类型，免得 statusFamily / method 退化成裸字符串 */
type LogQuery = NonNullable<Parameters<typeof fetchLogs>[0]>;

/** 汇总来自服务端按同一批筛选算好的 summary；还没拿到或请求失败时显示「—」而不是 0——
 *  0 会被读成「一条都没有」，而当时的事实是「还不知道」 */
const dash = (value: number | undefined, format: (input: number) => string): string =>
  value === undefined ? '—' : format(value);

export function LogsView() {
  // useSearchParams 需要 Suspense 边界，否则整页退化成客户端渲染
  return (
    <Suspense fallback={<LogsSkeleton />}>
      <LogsViewInner />
    </Suspense>
  );
}

function LogsViewInner() {
  const searchParams = useSearchParams();
  const { fmtDateTime, itemsPerPage } = useSiteFormat();

  // ?keyword= 由接口管理与规则抽屉的「查看调用日志」带进来，只作初值，之后不再同步回 URL
  const [liveMode, setLiveMode] = useState(false);
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null);

  const {
    data,
    loading,
    pending,
    error,
    refetch,
    keyword,
    setKeyword,
    filters,
    setFilter,
    sort,
    setSort,
    page,
    setPage,
    pageSize,
    setPageSize,
  } = useListQuery<LogQuery, CallLogPage, { statusFamily: string; method: string }>({
    fetcher: fetchLogs,
    initialKeyword: searchParams.get('keyword') ?? '',
    initialFilters: { statusFamily: 'all', method: 'all' },
    initialSort: { key: 'time', order: 'desc' },
    initialPageSize: itemsPerPage,
    debounceMs: 300,
    build: ({ keyword, filters, sort, page, pageSize }) => {
      const params: LogQuery = {
        page,
        pageSize,
        // 列 key 是 latencyMs（要和 CallLog 字段同名才能取到值），服务端的sort取值叫 latency
        sort: sort.key === 'latencyMs' ? 'latency' : sort.key === 'status' ? 'status' : 'time',
        order: sort.order,
      };
      if (keyword) params.keyword = keyword;
      // 429 本身属于 4xx，只能按精确状态码筛，走 statusFamily 会被 4xx 吞掉
      if (filters.statusFamily === '429') params.status = 429;
      else if (filters.statusFamily === '2xx' || filters.statusFamily === '4xx' || filters.statusFamily === '5xx') {
        params.statusFamily = filters.statusFamily;
      }
      if (filters.method === 'GET' || filters.method === 'POST') params.method = filters.method;
      return params;
    },
  });
  const statusFamily = filters.statusFamily;
  const method = filters.method;

  // 「实时追踪」= 每 5 秒拉一次；页面不可见时 usePolling 自己跳过
  usePolling(refetch, liveMode ? 5_000 : 0);

  // 四个格子与表格同源：summary 由服务端按同一批筛选结果算好，不是当前页的局部值
  const stats = data?.summary;

  const columns: TableColumn<CallLog>[] = [
    {
      key: 'time',
      title: '时间',
      dataIndex: 'time',
      sortable: true,
      widthClass: 'w-40',
      render: (log) => (
        <span className="font-mono text-[11.5px] text-muted">{fmtDateTime(log.time)}</span>
      ),
    },
    {
      key: 'method',
      title: '接口',
      dataIndex: 'method',
      widthClass: 'w-32',
      render: (log) => (
        <div className="flex items-center gap-2">
          <MethodBadge method={log.method} />
          <span className="font-mono text-[11px] text-ink">{log.path}</span>
        </div>
      ),
    },
    {
      key: 'status',
      title: '状态码',
      dataIndex: 'status',
      sortable: true,
      widthClass: 'w-24',
      render: (log) => {
        const tone = log.status < 300 ? 'ok' : log.status < 500 ? 'warn' : 'danger';
        return (
          <Badge tone={tone} mono>
            {log.status}
          </Badge>
        );
      },
    },
    {
      key: 'latencyMs',
      title: '耗时',
      dataIndex: 'latencyMs',
      sortable: true,
      widthClass: 'w-32',
      render: (log) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11.5px] text-ink">{formatDuration(log.latencyMs)}</span>
          <div className="h-1 w-12 overflow-hidden rounded-full bg-bg-soft">
            <div
              // 200ms 记满格，超 150ms 提前转黄
              className={`h-full ${log.latencyMs > 150 ? 'bg-warn' : 'bg-primary'}`}
              style={{ width: `${Math.min(100, (log.latencyMs / 200) * 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'ip',
      title: '来源',
      dataIndex: 'ip',
      widthClass: 'w-40',
      render: (log) => <span className="font-mono text-[11.5px] text-ink">{log.ip}</span>,
    },
    {
      key: 'caller',
      title: '调用方',
      dataIndex: 'caller',
      widthClass: 'w-32',
      render: (log) => (
        <span className={`text-[11.5px] ${log.caller === 'anonymous' ? 'text-muted' : 'text-ink'}`}>
          {log.caller === 'anonymous' ? '匿名' : log.caller}
        </span>
      ),
    },
    {
      key: 'cacheHit',
      title: '缓存',
      dataIndex: 'cacheHit',
      widthClass: 'w-20',
      render: (log) =>
        log.cacheHit === undefined ? (
          <span className="text-[11.5px] text-muted">—</span>
        ) : (
          <Badge tone={log.cacheHit ? 'ok' : 'neutral'} mono>
            {log.cacheHit ? 'HIT' : 'MISS'}
          </Badge>
        ),
    },
    {
      key: 'ua',
      title: 'UA',
      dataIndex: 'ua',
      widthClass: 'w-40',
      render: (log) => (
        <Tooltip content={log.ua}>
          <span className="block truncate text-[10.5px] text-muted">{log.ua}</span>
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="调用日志"
        description={`本进程记录的请求明细 · 环形缓冲保留最近 ${CALL_RING_CAPACITY} 条 · 可开启实时追踪`}
        actions={
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[12px] text-muted">
              <Switch checked={liveMode} onChange={setLiveMode} />
              <span>实时追踪</span>
            </label>
            <Button variant="outline" size="sm" onClick={() => refetch()} loading={pending}>
              <Icon name="refresh" size={13} />
              刷新
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="text-[22px] font-semibold text-ink">{dash(stats?.total, formatNumber)}</div>
          <div className="text-[11px] text-muted">当前筛选 · 记录数</div>
        </div>
        <div className="rounded-lg border border-warn/30 bg-warn-soft p-4">
          <div className="text-[22px] font-semibold text-warn">{dash(stats?.errors, formatNumber)}</div>
          <div className="text-[11px] text-muted">4xx / 5xx 错误</div>
        </div>
        <div className="rounded-lg border border-danger/30 bg-danger-soft p-4">
          <div className="text-[22px] font-semibold text-danger">{dash(stats?.blocked, formatNumber)}</div>
          <div className="text-[11px] text-muted">限流拦截 · 429</div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="text-[22px] font-semibold text-ink">{dash(stats?.avgLatencyMs, formatDuration)}</div>
          <div className="text-[11px] text-muted">
            平均延迟 · 缓存命中 {dash(stats?.cacheHitRate, formatPercent)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          icon={<Icon name="search" size={14} />}
          placeholder="搜索路径或来源 IP…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-64"
        />
        <div className="flex gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter('statusFamily', opt.value)}
              className={`rounded-full border px-3 py-1.5 text-[11.5px] transition-colors ${
                statusFamily === opt.value
                  ? 'border-primary bg-primary text-surface'
                  : 'border-line bg-surface text-muted hover:border-primary hover:text-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <select
          aria-label="按请求方法筛选"
          value={method}
          onChange={(e) => setFilter('method', e.target.value)}
          className="h-8 rounded-full border border-line bg-surface px-3 text-[11.5px] text-ink"
        >
          {METHOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {data?.items && <StatusBars logs={data.items} />}

      <Panel>
        <DataTable<CallLog>
          columns={columns}
          rows={data?.items ?? []}
          rowKey="id"
          sort={sort}
          onSortChange={setSort}
          loading={loading}
          skeletonRows={12}
          error={error}
          onRetry={() => void refetch()}
          emptyTitle="暂无匹配的日志"
          emptyDescription="调整筛选条件，或开启右上角「实时追踪」观察新请求。"
          onRowClick={(log) => setSelectedLog(log)}
        />
        <div className="mt-4">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={data?.total ?? 0}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </Panel>

      <LogDetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}

function LogsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <Panel>
        <Skeleton className="h-96" />
      </Panel>
    </div>
  );
}

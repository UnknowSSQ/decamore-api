'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { Badge, MethodBadge, Button, Icon, Input, Panel, PageHeader, Skeleton, Tooltip } from '@/components/ui';
import { DataTable, Pagination } from '@/components/ui/DataTable';
import { Switch } from '@/components/ui/Input';
import { useRequest } from '@/hooks/useRequest';
import { useDebouncedValue } from '@/hooks/useUi';
import { fetchLogs } from '@/lib/api';
import { formatNumber, formatDateTime, formatDuration } from '@/utils/format';
import type { CallLog, TableColumn, SortState } from '@/types';
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
  
  // ?path= 由接口管理的「查看调用日志」带进来，只作初值，之后不再同步回 URL
  const [keyword, setKeyword] = useState(searchParams.get('path') ?? '');
  const [statusFamily, setStatusFamily] = useState(searchParams.get('status') ?? 'all');
  const [method, setMethod] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [sort, setSort] = useState<SortState>({ key: 'time', order: 'desc' });
  const [liveMode, setLiveMode] = useState(false);
  const [selectedLog, setSelectedLog] = useState<CallLog | null>(null);

  const debouncedKeyword = useDebouncedValue(keyword, 300);

  const query = useMemo<LogQuery>(() => {
    const params: LogQuery = {
      page,
      pageSize,
      sort: sort.key === 'latency' || sort.key === 'status' ? sort.key : 'time',
      order: sort.order,
    };
    if (debouncedKeyword) params.keyword = debouncedKeyword;
    // 429 本身属于 4xx，只能按精确状态码筛，走 statusFamily 会被 4xx 吞掉
    if (statusFamily === '429') params.status = 429;
    else if (statusFamily === '2xx' || statusFamily === '4xx' || statusFamily === '5xx') {
      params.statusFamily = statusFamily;
    }
    if (method === 'GET' || method === 'POST') params.method = method;
    return params;
  }, [page, pageSize, sort, debouncedKeyword, statusFamily, method]);

  // 不开 immediate：首屏请求交给下面的 effect 带上默认 query，否则挂载时打两次
  const { data, loading, pending, run, refetch } = useRequest(fetchLogs);

  // 副作用只能放 effect：useMemo 按纯计算对待，允许被丢弃或重复执行
  useEffect(() => {
    void run(query);
  }, [query, run]);

  // 错误数与均值只覆盖当前页 items，total 用服务端总数，两者口径不同
  const stats = useMemo(() => {
    if (!data?.items) return { total: 0, errors: 0, blocked: 0, avgLatency: 0, cacheHitRate: 0 };
    const items = data.items;
    const total = data.total;
    const errors = items.filter((log) => log.status >= 400).length;
    const blocked = items.filter((log) => log.status === 429).length;
    const avgLatency = items.reduce((sum, log) => sum + log.latencyMs, 0) / items.length;
    const cacheHits = items.filter((log) => log.cacheHit).length;
    const cacheHitRate = items.length > 0 ? (cacheHits / items.length) * 100 : 0;
    return { total, errors, blocked, avgLatency, cacheHitRate };
  }, [data]);

  const columns: TableColumn<CallLog>[] = [
    {
      key: 'time',
      title: '时间',
      dataIndex: 'time',
      sortable: true,
      widthClass: 'w-40',
      render: (log) => (
        <span className="font-mono text-[11.5px] text-muted">{formatDateTime(log.time)}</span>
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
      widthClass: 'w-48',
      render: (log) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[11.5px] text-ink">{log.ip}</span>
          <span className="text-[10.5px] text-muted">{log.region}</span>
        </div>
      ),
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
      render: (log) => (
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
        description="全站请求明细 · 保留 30 天 · 支持实时追踪与 CSV 导出"
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
            <Button variant="primary" size="sm" trailing="↗">
              导出 CSV
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="text-[22px] font-semibold text-ink">{formatNumber(stats.total)}</div>
          <div className="text-[11px] text-muted">当前筛选 · 记录数</div>
        </div>
        <div className="rounded-lg border border-warn/30 bg-warn-soft p-4">
          <div className="text-[22px] font-semibold text-warn">{formatNumber(stats.errors)}</div>
          <div className="text-[11px] text-muted">4xx / 5xx 错误</div>
        </div>
        <div className="rounded-lg border border-danger/30 bg-danger-soft p-4">
          <div className="text-[22px] font-semibold text-danger">{formatNumber(stats.blocked)}</div>
          <div className="text-[11px] text-muted">限流拦截 · 429</div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="text-[22px] font-semibold text-ink">{formatDuration(stats.avgLatency)}</div>
          <div className="text-[11px] text-muted">平均延迟</div>
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
              onClick={() => {
                setStatusFamily(opt.value);
                setPage(1);
              }}
              className={`rounded-full border px-3 py-1.5 text-[11.5px] transition-colors ${
                statusFamily === opt.value
                  ? 'border-primary bg-primary text-[#fffefa]'
                  : 'border-line bg-surface text-muted hover:border-primary hover:text-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <select
          value={method}
          onChange={(e) => {
            setMethod(e.target.value);
            setPage(1);
          }}
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

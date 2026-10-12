'use client';
import dynamic from 'next/dynamic';
import { useCallback, useMemo, useState } from 'react';

import {
  Button,
  DataTable,
  EmptyState,
  Icon,
  Input,
  Kbd,
  MethodBadge,
  PageHeader,
  Pagination,
  Switch,
} from '@/components/ui';
import { useCan } from '@/hooks/usePermission';
import { useListQuery } from '@/hooks/useListQuery';
import { useOptimisticToggle } from '@/hooks/useOptimisticToggle';
import { useSiteFormat } from '@/hooks/useSiteFormat';
import { fetchManagedApis, updateManagedApi } from '@/lib/api';
import type { ApiListQuery } from '@/lib/zod/admin.schema';
import { hasAuthoredDoc } from '@/components/docs/authored-slugs';
import { isImplementedApiId } from '@/constants/api-catalog';
import { docApiHref } from '@/constants/app';
import { formatCompactCn, formatPercent } from '@/utils/format';
import { API_CATEGORIES, type ManagedApi, type Paged, type TableColumn } from '@/types';

/** 分类取值来自 types/domain 的那一份字面量，顺序与新建表单一致，不再在这里手写第四遍 */
const CATEGORY_FILTERS = ['全部', ...API_CATEGORIES] as const;

/**
 * 抽屉与表单按需加载：两者各自拖着 zod 写校验与代码窗（含 highlight 着色），列表首屏用不到。
 * 首次打开后才挂载、之后不再卸载——出场动画需要组件还活着。
 */
const ApiDetailDrawer = dynamic(() => import('./ApiDetailDrawer').then((m) => m.ApiDetailDrawer), { ssr: false });
const ApiFormModal = dynamic(() => import('./ApiFormModal').then((m) => m.ApiFormModal), { ssr: false });
type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'online', label: '在线' },
  { value: 'degraded', label: '降级' },
] as const;

/** 200ms 记满格，下限 2px 让极快的接口也留得下痕迹 */
function latBarWidth(ms: number): number {
  return Math.min(44, Math.max(2, (ms / 200) * 44));
}

export function ApisView() {
  const { itemsPerPage } = useSiteFormat();
  const canWrite = useCan('api:write');

  // 列 key 与后端 sort 值不同名，这里改名；空筛选传 undefined 而非空串
  const {
    data,
    loading,
    pending,
    error,
    refetch,
    setData,
    reload,
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
  } = useListQuery<Partial<ApiListQuery>, Paged<ManagedApi>, { category: CategoryFilter; status: string }>({
    fetcher: fetchManagedApis,
    initialFilters: { category: '全部', status: '' },
    initialSort: { key: 'calls24h', order: 'desc' },
    initialPageSize: itemsPerPage,
    build: ({ keyword, filters, sort, page, pageSize }) => ({
      keyword: keyword || undefined,
      category: filters.category !== '全部' ? filters.category : undefined,
      status: (filters.status || undefined) as 'online' | 'degraded' | undefined,
      sort: sort.key === 'calls24h' ? 'calls' : sort.key === 'avgLatencyMs' ? 'latency' : sort.key === 'errorRate' ? 'errorRate' : 'updated',
      order: sort.order,
      page,
      pageSize,
    }),
  });

  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSeen, setDrawerSeen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSeen, setModalSeen] = useState(false);
  const { togglingId, toggle: handleStatusToggle } = useOptimisticToggle<ManagedApi>({
    setData,
    toPatch: (next) => ({ status: next ? 'online' : 'degraded' }),
    persist: (id, patch) => updateManagedApi(id, patch),
    successMessage: (api, next) => `「${api.name}」已${next ? '上线' : '转入维护'}`,
  });

  // 抽屉那一行从 data 里取而不是存副本：存副本会在列表刷新或行内开关切换后停在打开那一刻的形状上
  const drawerApi = useMemo(
    () => data?.items.find((item) => item.id === drawerId) ?? null,
    [data, drawerId],
  );

  const openDetail = useCallback((api: ManagedApi) => {
    setDrawerId(api.id);
    setDrawerSeen(true);
    setDrawerOpen(true);
  }, []);

  const handleCreate = () => {
    setModalSeen(true);
    setModalOpen(true);
  };

  const handleFormSuccess = () => {
    void reload();
  };

  const total = data?.total ?? 0;
  const onlineCount = useMemo(() => {
    if (!data?.items) return 0;
    return data.items.filter((a) => a.status === 'online').length;
  }, [data]);

  const columns: TableColumn<ManagedApi>[] = useMemo(
    () => [
      {
        key: 'name',
        title: '接口',
        widthClass: 'min-w-[160px]',
        render: (row) => (
          <div className="flex flex-col gap-0.5">
            <span className="cell-main text-[13px] font-medium text-ink">{row.name}</span>
            {/* 描述与 /docs 同一字段：这里改了，文档标题下那句话同步变 */}
            <span className="cell-sub max-w-[260px] truncate text-[11px] text-muted">
              {row.description || row.category}
            </span>
          </div>
        ),
      },
      {
        key: 'method',
        title: '方法',
        widthClass: 'w-[72px]',
        render: (row) => <MethodBadge method={row.method} />,
      },
      {
        key: 'path',
        title: '路径',
        widthClass: 'min-w-[140px]',
        render: (row) => (
          <span className="endpoint font-mono text-[11px] text-muted">{row.path}</span>
        ),
      },
      {
        key: 'sync',
        title: '同步状态',
        widthClass: 'w-[128px]',
        render: (row) => (
          <div className="flex flex-col items-start gap-1">
            <span
              className={`rounded-full border px-2 py-[2px] text-[10.5px] font-medium ${
                isImplementedApiId(row.id)
                  ? 'border-line bg-bg-soft text-ok'
                  : 'border-line bg-bg-soft text-warn'
              }`}
            >
              {isImplementedApiId(row.id) ? '服务端已实现' : '服务端未实现'}
            </span>
            <span className="rounded-full border border-line bg-bg-soft px-2 py-[2px] text-[10.5px] font-medium text-muted">
              {hasAuthoredDoc(row.id) ? '文档已撰写' : '文档待撰写'}
            </span>
          </div>
        ),
      },
      {
        key: 'calls24h',
        title: '调用 · 24h',
        widthClass: 'w-[100px]',
        align: 'right',
        sortable: true,
        render: (row) => (
          <span className="num font-mono text-[12.5px] text-ink">
            {formatCompactCn(row.calls24h)}
          </span>
        ),
      },
      {
        key: 'avgLatencyMs',
        title: '均耗时',
        widthClass: 'w-[110px]',
        align: 'right',
        sortable: true,
        render: (row) => (
          <span className="inline-flex items-center gap-2">
            <span className="num font-mono text-[12.5px] text-ink">{row.avgLatencyMs}ms</span>
            <span
              className="lat-bar inline-block h-[4px] rounded-full bg-primary/40"
              style={{ width: `${latBarWidth(row.avgLatencyMs)}px` }}
              aria-hidden
            />
          </span>
        ),
      },
      {
        key: 'errorRate',
        title: '错误率',
        widthClass: 'w-[80px]',
        align: 'right',
        sortable: true,
        render: (row) => (
          <span
            className={`num font-mono text-[12.5px] ${row.errorRate > 1 ? 'text-danger' : 'text-ink'}`}
          >
            {formatPercent(row.errorRate, 2)}
          </span>
        ),
      },
      {
        key: 'status',
        title: '状态',
        widthClass: 'w-[100px]',
        render: (row) => (
          <Switch
            checked={row.status === 'online'}
            onChange={(v) => void handleStatusToggle(row, v)}
            disabled={togglingId === row.id}
          />
        ),
      },
      {
        key: 'actions',
        title: '操作',
        widthClass: 'w-[116px]',
        render: (row) => (
          <span className="inline-flex gap-1">
            <button
              type="button"
              className="icon-mini grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-line text-muted transition-colors hover:border-primary hover:bg-wash hover:text-primary"
              aria-label={`${row.name} 的接口文档`}
              onClick={() => window.open(docApiHref(row.id), '_blank', 'noopener')}
            >
              <Icon name="external" size={14} />
            </button>
            <button
              type="button"
              className="icon-mini grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-line text-muted transition-colors hover:border-primary hover:bg-wash hover:text-primary"
              aria-label="查看详情"
              onClick={() => openDetail(row)}
            >
              <Icon name="eye" size={14} />
            </button>
            <button
              type="button"
              className="icon-mini grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-line text-muted transition-colors hover:border-primary hover:bg-wash hover:text-primary"
              aria-label="查看调用日志"
              onClick={() => {
                window.location.href = `/admin/logs?keyword=${encodeURIComponent(row.path)}`;
              }}
            >
              <Icon name="list" size={14} />
            </button>
          </span>
        ),
      },
    ],
    [openDetail, togglingId, handleStatusToggle],
  );

  const rows = data?.items ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <span className="kicker" style={{ marginBottom: 0 }}>Resources</span>
            <span>接口管理</span>
          </span>
        }
        description={
          <span className="inline-flex items-center gap-1.5">
            注册、上下线与版本治理 · {total} 个已注册接口，{onlineCount} 个在线
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              loading={pending}
            >
              <Icon name="refresh" size={14} />
              刷新
            </Button>
            {canWrite && (
              <Button variant="primary" size="sm" onClick={handleCreate}>
                <Icon name="plus" size={14} />
                注册新接口
              </Button>
            )}
          </div>
        }
      />

      <div className="toolbar flex flex-wrap items-center gap-3">
        <div className="relative">
          <Input
            icon={<Icon name="search" size={15} />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索名称、路径或分类…"
            className="h-[42px] w-[260px] rounded-full"
            suffix={<Kbd>/</Kbd>}
          />
        </div>

        <div className="chips flex items-center gap-1.5">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`chip rounded-full border px-3 py-1 text-[12px] transition-colors ${
                filters.category === cat
                  ? 'border-primary bg-primary/10 font-semibold text-primary'
                  : 'border-line text-muted hover:border-primary/40 hover:text-ink'
              }`}
              onClick={() => setFilter('category', cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <select
          aria-label="按接口状态筛选"
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          className="h-[36px] rounded-full border border-line bg-surface px-3 text-[12px] text-ink"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <EmptyState
          mark="⚠"
          title="加载失败"
          description={error.message || '接口列表请求失败，请重试'}
          action={
            <Button variant="outline" size="sm" onClick={() => void reload()}>
              重试
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto max-[760px]:block">
            <DataTable<ManagedApi>
              columns={columns}
              rows={rows}
              rowKey="id"
              sort={sort}
              onSortChange={setSort}
              loading={loading}
              skeletonRows={8}
              emptyTitle="暂无接口"
              emptyDescription="还没有注册任何接口，点击下方按钮创建第一个"
              emptyAction={
                canWrite ? (
                  <Button variant="primary" size="sm" onClick={handleCreate}>
                    <Icon name="plus" size={14} />
                    新建接口
                  </Button>
                ) : undefined
              }
            />
          </div>

          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}

      {drawerSeen && (
        <ApiDetailDrawer
          api={drawerApi}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onRefresh={() => void reload()}
        />
      )}

      {modalSeen && (
        <ApiFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

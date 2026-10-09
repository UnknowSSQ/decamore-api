'use client';
import { useCallback, useMemo, useState } from 'react';

import {
  Button,
  ConfirmModal,
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
import { useToast } from '@/hooks/useToast';
import { deleteManagedApi, fetchManagedApis, updateManagedApi } from '@/lib/api';
import type { ApiListQuery } from '@/lib/zod/admin.schema';
import { AUTHORED_DOC_SLUGS } from '@/components/docs/authored-slugs';
import { IMPLEMENTED_API_IDS } from '@/constants/api-catalog';
import { docApiHref } from '@/constants/app';
import { formatCompactCn, formatPercent } from '@/utils/format';
import type { ManagedApi, Paged, TableColumn } from '@/types';

import { ApiDetailDrawer } from './ApiDetailDrawer';
import { ApiFormModal } from './ApiFormModal';

const CATEGORY_FILTERS = ['全部', '内容', '数据', '图片'] as const;
type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'online', label: '在线' },
  { value: 'degraded', label: '降级' },
  { value: 'offline', label: '停用' },
] as const;

/** 200ms 记满格，下限 2px 让极快的接口也留得下痕迹 */
function latBarWidth(ms: number): number {
  return Math.min(44, Math.max(2, (ms / 200) * 44));
}

export function ApisView() {
  const canWrite = useCan('api:write');
  const toast = useToast();

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
    build: ({ keyword, filters, sort, page, pageSize }) => ({
      keyword: keyword || undefined,
      category: filters.category !== '全部' ? filters.category : undefined,
      status: (filters.status || undefined) as 'online' | 'degraded' | 'offline' | undefined,
      sort: sort.key === 'calls24h' ? 'calls' : sort.key === 'avgLatencyMs' ? 'latency' : sort.key === 'errorRate' ? 'errorRate' : 'updated',
      order: sort.order,
      page,
      pageSize,
    }),
  });

  const [drawerApi, setDrawerApi] = useState<ManagedApi | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApi, setEditingApi] = useState<ManagedApi | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedApi | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const handleStatusToggle = useCallback(
    async (api: ManagedApi, next: boolean) => {
      setTogglingId(api.id);
      const prev = api.status;
      // 先落本地，Switch 不等 RTT
      setData((d) => {
        if (!d) return d;
        return {
          ...d,
          items: d.items.map((item) =>
            item.id === api.id ? { ...item, status: next ? 'online' : 'degraded' } : item,
          ),
        };
      });
      try {
        await updateManagedApi(api.id, {
          status: next ? 'online' : 'degraded',
        });
        toast.success(`「${api.name}」已${next ? '上线' : '转入维护'}`);
      } catch {
        setData((d) => {
          if (!d) return d;
          return {
            ...d,
            items: d.items.map((item) =>
              item.id === api.id ? { ...item, status: prev } : item,
            ),
          };
        });
        toast.error('状态更新失败');
      } finally {
        setTogglingId(null);
      }
    },
    [setData, toast],
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletePending(true);
    try {
      await deleteManagedApi(deleteTarget.id);
      toast.success(`「${deleteTarget.name}」已删除`);
      setDeleteTarget(null);
      void reload();
    } catch {
      toast.error('删除失败');
    } finally {
      setDeletePending(false);
    }
  };

  const openDetail = useCallback((api: ManagedApi) => {
    setDrawerApi(api);
    setDrawerOpen(true);
  }, []);

  const handleCreate = () => {
    setEditingApi(null);
    setModalOpen(true);
  };

  const handleFormSuccess = () => {
    void reload();
    if (!editingApi) {
      // 后端还没回新记录的 id，只能等 refetch 后手动点开抽屉
    }
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
                IMPLEMENTED_API_IDS.includes(row.id)
                  ? 'border-line bg-bg-soft text-ok'
                  : 'border-line bg-bg-soft text-warn'
              }`}
            >
              {IMPLEMENTED_API_IDS.includes(row.id) ? '服务端已实现' : '服务端未实现'}
            </span>
            <span className="rounded-full border border-line bg-bg-soft px-2 py-[2px] text-[10.5px] font-medium text-muted">
              {AUTHORED_DOC_SLUGS.includes(row.id) ? '文档已撰写' : '文档待撰写'}
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
                window.location.href = `/admin/logs?path=${encodeURIComponent(row.path)}`;
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

      <ApiDetailDrawer
        api={drawerApi}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRefresh={() => void reload()}
      />

      <ApiFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingApi={editingApi}
        onSuccess={handleFormSuccess}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="确认删除接口"
        description={
          deleteTarget
            ? `即将删除「${deleteTarget.name}」（${deleteTarget.path}），此操作不可恢复。已注册的调用方将无法继续调用该接口。`
            : undefined
        }
        confirmText="删除"
        danger
        loading={deletePending}
      />
    </div>
  );
}

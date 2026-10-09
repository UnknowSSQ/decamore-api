'use client';
import { useCallback, useMemo, useState } from 'react';

import {
  Badge,
  Button,
  Callout,
  ConfirmModal,
  DataTable,
  EmptyState,
  Icon,
  Input,
  Kbd,
  PageHeader,
  Switch,
} from '@/components/ui';
import { useCan } from '@/hooks/usePermission';
import { useListQuery } from '@/hooks/useListQuery';
import { useToast } from '@/hooks/useToast';
import { deleteRule, fetchRules, updateRule } from '@/lib/api';
import { formatCompactCn, formatNumber } from '@/utils/format';
import type { RuleListQuery } from '@/lib/zod/admin.schema';
import type { AccessRule, Paged, TableColumn } from '@/types';

import { RuleDetailDrawer } from './RuleDetailDrawer';
import { RuleFormModal } from './RuleFormModal';

const TYPE_FILTERS = [
  { value: '', label: '全部' },
  { value: 'rate', label: '限流' },
  { value: 'cache', label: '缓存' },
  { value: 'block', label: '拦截' },
] as const;

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'enabled', label: '启用' },
  { value: 'disabled', label: '停用' },
] as const;

/** 存储按 action，展示归成三类；log 也按限流算 */
function actionToType(action: string): string {
  if (action === '429' || action === 'log') return 'rate';
  if (action === 'reject') return 'block';
  return 'cache';
}

const ACTION_META: Record<string, { label: string; tone: 'ok' | 'warn' | 'danger' | 'neutral' | 'brand' }> = {
  '429': { label: '429', tone: 'warn' },
  reject: { label: 'reject', tone: 'danger' },
  captcha: { label: 'captcha', tone: 'brand' },
  log: { label: 'log', tone: 'neutral' },
};

export function RulesView() {
  const canWrite = useCan('rule:write');
  const toast = useToast();

  const {
    data,
    loading,
    error,
    setData,
    reload,
    keyword,
    setKeyword,
    filters,
    setFilter,
    sort,
    setSort,
  } = useListQuery<RuleListQuery, Paged<AccessRule>, { status: string }>({
    fetcher: fetchRules,
    initialFilters: { status: '' },
    initialSort: { key: 'hitsToday', order: 'desc' },
    initialPageSize: 20,
    // 空串是「不限」，必须转成 undefined，否则会被当成 enabled=false
    build: ({ keyword, filters, sort, page, pageSize }) => ({
      keyword: keyword || undefined,
      enabled: filters.status === 'enabled' ? true : filters.status === 'disabled' ? false : undefined,
      page,
      pageSize,
      sort: sort.key === 'limit' || sort.key === 'updatedAt' ? sort.key : 'hitsToday',
      order: sort.order,
    }),
  });

  // type 归类只作用于当前页（服务端按 action 收，rate 组跨 429/log 两个 action）
  const [typeFilter, setTypeFilter] = useState('');

  const [drawerRule, setDrawerRule] = useState<AccessRule | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AccessRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccessRule | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const handleStatusToggle = useCallback(
    async (rule: AccessRule, next: boolean) => {
      setTogglingId(rule.id);
      const prev = rule.enabled;
      // 先落本地，Switch 不等 RTT
      setData((d) => {
        if (!d) return d;
        return {
          ...d,
          items: d.items.map((item) =>
            item.id === rule.id ? { ...item, enabled: next } : item,
          ),
        };
      });
      try {
        await updateRule(rule.id, { enabled: next });
        toast.success(`规则「${rule.name}」已${next ? '启用' : '停用'}`);
      } catch {
        // 失败就退回 prev
        setData((d) => {
          if (!d) return d;
          return {
            ...d,
            items: d.items.map((item) =>
              item.id === rule.id ? { ...item, enabled: prev } : item,
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
      await deleteRule(deleteTarget.id);
      toast.success(`规则「${deleteTarget.name}」已删除`);
      setDeleteTarget(null);
      void reload();
    } catch {
      toast.error('删除失败');
    } finally {
      setDeletePending(false);
    }
  };

  const openDetail = useCallback((rule: AccessRule) => {
    setDrawerRule(rule);
    setDrawerOpen(true);
  }, []);

  const handleCreate = () => {
    setEditingRule(null);
    setModalOpen(true);
  };

  const handleFormSuccess = () => {
    void reload();
  };

  const total = data?.total ?? 0;
  const activeCount = useMemo(() => {
    if (!data?.items) return 0;
    return data.items.filter((r) => r.enabled).length;
  }, [data]);

  const totalHits = useMemo(() => {
    if (!data?.items) return 0;
    return data.items.reduce((sum, r) => sum + r.hitsToday, 0);
  }, [data]);

  // type 服务端不认，只对当前页二次过滤，和分页口径不一致
  const filteredRows = useMemo(() => {
    if (!data?.items) return [];
    let rows = data.items;
    if (typeFilter) {
      rows = rows.filter((r) => actionToType(r.action) === typeFilter);
    }
    return rows;
  }, [data?.items, typeFilter]);

  const columns: TableColumn<AccessRule>[] = useMemo(
    () => [
      {
        key: 'name',
        title: '规则',
        widthClass: 'min-w-[180px]',
        render: (row) => (
          <div className="flex flex-col gap-0.5">
            <span
              className={`cell-main text-[13px] font-medium text-ink ${
                !row.enabled ? 'line-through opacity-[0.62]' : ''
              }`}
            >
              {row.name}
            </span>
            <span className="cell-sub font-mono text-[10.5px] text-muted">{row.scope}</span>
          </div>
        ),
      },
      {
        key: 'action',
        title: '类型',
        widthClass: 'w-[90px]',
        render: (row) => {
          const meta = ACTION_META[row.action] ?? ACTION_META['429']!;
          return <Badge tone={meta.tone}>{meta.label}</Badge>;
        },
      },
      {
        key: 'limit',
        title: '阈值',
        widthClass: 'w-[120px]',
        align: 'right',
        sortable: true,
        render: (row) => (
          <span className="num font-mono text-[12.5px] text-ink">
            {formatNumber(row.limit)} 次 / {row.periodSec}s
          </span>
        ),
      },
      {
        key: 'hitsToday',
        title: '命中 · 24h',
        widthClass: 'w-[100px]',
        align: 'right',
        sortable: true,
        render: (row) => (
          <span className="num font-mono text-[12.5px] text-ink">
            {formatCompactCn(row.hitsToday)}
          </span>
        ),
      },
      {
        key: 'enabled',
        title: '状态',
        widthClass: 'w-[100px]',
        render: (row) => (
          <Switch
            checked={row.enabled}
            onChange={(v) => void handleStatusToggle(row, v)}
            disabled={togglingId === row.id}
          />
        ),
      },
      {
        key: 'actions',
        title: '操作',
        widthClass: 'w-[80px]',
        render: (row) => (
          <span className="inline-flex gap-1">
            <button
              type="button"
              className="icon-mini grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-line text-muted transition-colors hover:border-primary hover:bg-wash hover:text-primary"
              aria-label="查看详情"
              onClick={() => openDetail(row)}
            >
              <Icon name="eye" size={14} />
            </button>
            {canWrite && (
              <button
                type="button"
                className="icon-mini grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-line text-muted transition-colors hover:border-danger hover:bg-wash hover:text-danger"
                aria-label="删除规则"
                onClick={() => setDeleteTarget(row)}
              >
                <Icon name="trash" size={14} />
              </button>
            )}
          </span>
        ),
      },
    ],
    [openDetail, togglingId, canWrite, handleStatusToggle],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <span className="kicker" style={{ marginBottom: 0 }}>Governance</span>
            <span>访问规则</span>
          </span>
        }
        description={
          <span className="inline-flex items-center gap-1.5">
            免密钥架构下的流量治理层 · {total} 条规则，{activeCount} 条生效 · 24h 累计命中{' '}
            {formatCompactCn(totalHits)} 次
          </span>
        }
        actions={
          canWrite && (
            <Button variant="primary" size="sm" onClick={handleCreate}>
              <Icon name="plus" size={14} />
              新建规则
            </Button>
          )
        }
      />

      <Callout tone="info" mark="i">
        <p>
          <strong>免密钥模式：</strong>
          Decamore API 无需注册与签名，开发者直接调用。服务的公平与稳定由访问规则保障 —— 单 IP 频控、热点缓存与恶意拦截全部在边缘节点执行，规则变更约 30 秒内全网生效，按优先级自上而下匹配，命中即执行首个动作。
        </p>
      </Callout>

      <div className="toolbar flex flex-wrap items-center gap-3">
        <div className="relative">
          <Input
            icon={<Icon name="search" size={15} />}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索规则名称或匹配目标…"
            className="h-[42px] w-[260px] rounded-full"
            suffix={<Kbd>/</Kbd>}
          />
        </div>

        <div className="chips flex items-center gap-1.5">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`chip rounded-full border px-3 py-1 text-[12px] transition-colors ${
                typeFilter === t.value
                  ? 'border-primary bg-primary/10 font-semibold text-primary'
                  : 'border-line text-muted hover:border-primary/40 hover:text-ink'
              }`}
              onClick={() => setTypeFilter(t.value)}
            >
              {t.label}
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

        <span className="ml-auto text-[12px] text-muted">
          显示 {filteredRows.length} / {total} 条
        </span>
      </div>

      {error ? (
        <EmptyState
          mark="⚠"
          title="加载失败"
          description={error.message || '规则列表请求失败，请重试'}
          action={
            <Button variant="outline" size="sm" onClick={() => void reload()}>
              重试
            </Button>
          }
        />
      ) : (
        <DataTable<AccessRule>
          columns={columns}
          rows={filteredRows}
          rowKey="id"
          sort={sort}
          onSortChange={setSort}
          loading={loading}
          skeletonRows={6}
          emptyTitle="暂无规则"
          emptyDescription="还没有配置任何访问规则"
          emptyAction={
            canWrite ? (
              <Button variant="primary" size="sm" onClick={handleCreate}>
                <Icon name="plus" size={14} />
                新建规则
              </Button>
            ) : undefined
          }
        />
      )}

      <RuleDetailDrawer
        rule={drawerRule}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onRefresh={() => void reload()}
      />

      <RuleFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingRule={editingRule}
        onSuccess={handleFormSuccess}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="确认删除规则"
        description={
          deleteTarget
            ? `即将删除「${deleteTarget.name}」，此操作不可恢复。规则删除后，匹配的请求将不再受该规则约束。`
            : undefined
        }
        confirmText="删除"
        danger
        loading={deletePending}
      />
    </div>
  );
}

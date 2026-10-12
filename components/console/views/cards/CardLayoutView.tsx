'use client';
/**
 * 卡片布局：首页 Live 区与接口广场两套 12 列网格在同一页编辑。
 * 数组顺序就是要的渲染顺序，所以行控件按顺序提交，跨度按 id 匹配。
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import { Button, Callout, EmptyState, PageHeader, Panel, PanelTitle, Skeleton } from '@/components/ui';
import { Segmented } from '@/components/ui/Tabs';
import { Select } from '@/components/ui/Select';
import { Icon } from '@/components/ui/Icon';
import { useCan } from '@/hooks/usePermission';
import { useRequest } from '@/hooks/useRequest';
import { useToast } from '@/hooks/useToast';
import { fetchPlazaCatalog, fetchSiteSettings, patchSiteSettings } from '@/lib/api';
import { siteSettingsPatchSchema, type SiteSettingsPatchInput } from '@/lib/zod/admin.schema';
import {
  CARD_COLS_RANGE,
  CARD_GRID_COLS,
  CARD_ROWS_RANGE,
  PLAZA_CARD_DEFAULT_SPAN,
  cardName,
  cardSpan,
  layoutOrder,
} from '@/constants/card-layout';
import { cn } from '@/utils/cn';
import type { ApiCatalogItem, CardSpan } from '@/types';

type Tab = 'live' | 'plaza';

/** 两套布局一起存草稿：切 tab 不丢改动，保存时只提交真的变过的那一组 */
type Draft = Record<Tab, CardSpan[]>;

const TAB_OPTIONS: readonly { value: Tab; label: string }[] = [
  { value: 'live', label: '首页 Live' },
  { value: 'plaza', label: '接口广场' },
];

function spanOptions(range: { min: number; max: number }, unit: string) {
  return Array.from({ length: range.max - range.min + 1 }, (_, index) => {
    const value = range.min + index;
    return { value: String(value), label: `${value} ${unit}` };
  });
}

const COL_OPTIONS = spanOptions(CARD_COLS_RANGE, '列');
const ROW_OPTIONS = spanOptions(CARD_ROWS_RANGE, '行');

const TAB_LABEL: Record<Tab, string> = { live: '首页', plaza: '广场' };

export function CardLayoutView() {
  const canWrite = useCan('settings:write');
  const toast = useToast();

  const { data, loading, error, refetch } = useRequest(fetchSiteSettings, { immediate: true });
  const { data: catalogData } = useRequest(fetchPlazaCatalog, { immediate: true });

  const [tab, setTab] = useState<Tab>('live');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState<Draft | null>(null);
  const [pickSlug, setPickSlug] = useState('');

  // 拖拽只在按住把手时开启：整行 draggable 会让行里的 select 在 Firefox 打不开
  const [armed, setArmed] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!data) return;
    const next: Draft = { live: data.liveCardLayout, plaza: data.plazaCardLayout };
    setDraft(next);
    setSaved(next);
  }, [data]);

  const items = useMemo(() => catalogData?.items ?? [], [catalogData]);
  const nameOf = (id: string) => items.find((item) => item.id === id)?.name ?? cardName(id);
  const pathOf = (id: string) => items.find((item) => item.id === id)?.path ?? `/api/v1/${id}`;

  /** 编辑列表：首页只列已选成员，广场把车单全集按布局顺序铺开（新接口自动接在末尾） */
  const rows: CardSpan[] = useMemo(() => {
    if (!draft) return [];
    if (tab === 'live') return draft.live;
    return layoutOrder(draft.plaza, items.map((item) => item.id)).map((id) =>
      cardSpan(draft.plaza, id, PLAZA_CARD_DEFAULT_SPAN),
    );
  }, [draft, tab, items]);

  const dirtyTabs = useMemo(() => {
    if (!draft || !saved) return [];
    const changed: Tab[] = [];
    for (const kind of ['live', 'plaza'] as const) {
      if (JSON.stringify(draft[kind]) !== JSON.stringify(saved[kind])) changed.push(kind);
    }
    return changed;
  }, [draft, saved]);

  const commit = (kind: Tab, next: CardSpan[]) => {
    if (!canWrite) return;
    setDraft((prev) => (prev ? { ...prev, [kind]: next } : prev));
  };

  const setSpan = (kind: Tab, id: string, key: 'cols' | 'rows', value: number) =>
    commit(
      kind,
      rows.map((span) => (span.id === id ? { ...span, [key]: value } : span)),
    );

  /** 拖动落点与上下按钮共用这一次重排：先摘出再插回，索引由调用方给 */
  const move = (kind: Tab, fromId: string, toId: string) => {
    if (fromId === toId) return;
    const next = [...rows];
    const from = next.findIndex((span) => span.id === fromId);
    const to = next.findIndex((span) => span.id === toId);
    if (from < 0 || to < 0) return;
    const [picked] = next.splice(from, 1);
    if (picked) next.splice(to, 0, picked);
    commit(kind, next);
  };

  const step = (kind: Tab, id: string, delta: -1 | 1) => {
    const index = rows.findIndex((span) => span.id === id);
    const target = rows[index + delta];
    if (index < 0 || !target) return;
    move(kind, id, target.id);
    // 焦点跟着卡片走，否则键盘用户按完下移焦点会掉回第一行
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLButtonElement>(`[data-card="${id}"]`)?.focus();
    });
  };

  const removeFromHome = (id: string) => commit('live', rows.filter((span) => span.id !== id));

  const addToHome = (id: string) => {
    if (!draft || !id || draft.live.some((span) => span.id === id)) return;
    commit('live', [...draft.live, { id, cols: 4, rows: 1 }]);
    setPickSlug('');
  };

  const unadded = items.filter((item) => !draft?.live.some((span) => span.id === item.id));

  const handleReset = () => {
    if (!saved) return;
    setDraft(saved);
    toast.success('已回到上次保存的布局');
  };

  const handleSave = async () => {
    if (!draft || dirtyTabs.length === 0) return;
    // 服务端规则是 min(1)，空列表先在这里拦下来，免得用户只看到一句英文校验文案
    if (draft.live.length === 0) {
      toast.error('首页至少要保留一张卡片');
      return;
    }

    const patch: SiteSettingsPatchInput = {};
    for (const kind of dirtyTabs) {
      if (kind === 'live') patch.liveCardLayout = draft.live;
      else patch.plazaCardLayout = draft.plaza;
    }

    const parsed = siteSettingsPatchSchema.safeParse(patch);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? '布局参数不合法');
      return;
    }

    try {
      await patchSiteSettings(parsed.data);
      setSaved(draft);
      toast.success(`已保存${dirtyTabs.map((kind) => TAB_LABEL[kind]).join('与')}布局`);
      await refetch();
    } catch {
      toast.error('保存失败');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || dirtyTabs.length === 0) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirtyTabs.length]);

  if (loading) return <LayoutSkeleton />;
  if (error || !draft) {
    return (
      <EmptyState
        title="加载失败"
        description="无法获取当前布局，请重试。"
        action={<Button onClick={() => refetch()}>重试</Button>}
      />
    );
  }

  const endDrag = () => {
    setArmed(null);
    setDragging(null);
    setDropTarget(null);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="卡片布局"
        description={`首页与接口广场都按 ${CARD_GRID_COLS} 列网格排布 · 列表顺序就是前台顺序，保存后下一次渲染生效`}
        actions={
          <>
            <span className="mr-1 text-[11.5px] text-muted">
              {dirtyTabs.length === 0 ? '没有未保存的改动' : `${dirtyTabs.length} 组布局待保存`}
            </span>
            <Button variant="outline" size="sm" onClick={handleReset} disabled={dirtyTabs.length === 0}>
              重置
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={dirtyTabs.length === 0 || !canWrite}
            >
              保存变更
            </Button>
          </>
        }
      />

      {!canWrite && (
        <Callout tone="warn" mark="!">
          <strong>只读模式：</strong>当前角色无权修改卡片布局，如需调整请联系管理员。
        </Callout>
      )}

      <Segmented options={TAB_OPTIONS} value={tab} onChange={setTab} ariaLabel="选择要编辑的布局" />

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,360px)] gap-5 max-xl:grid-cols-1">
        <Panel className="p-4">
          <PanelTitle
            title={tab === 'live' ? '首页 Live 卡片' : '接口广场卡片'}
            description={
              tab === 'live'
                ? '决定首页展示哪些接口、每张卡占几列几行；没有加入的接口只在文档与广场里出现。'
                : '顺序即广场默认顺序；搜索与分类筛选命中时仍按相关性排，跨度按接口匹配。'
            }
          />

          {rows.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                mark="◇"
                title="还没有卡片"
                description="从下面的候选里挑一个接口加入首页。"
                className="min-h-[180px] border-dashed"
              />
            </div>
          ) : (
            <ol
              ref={listRef}
              className="mt-4 flex flex-col gap-2"
              onDragOver={(event) => {
                if (!dragging) return;
                // 让 drop 事件真的触发（默认会被浏览器拒绝）
                event.preventDefault();
              }}
            >
              {rows.map((span, index) => {
                const isDragging = dragging === span.id;
                const isTarget = dropTarget === span.id && isDragging === false;
                return (
                  <li
                    key={span.id}
                    draggable={armed === span.id}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move';
                      setDragging(span.id);
                    }}
                    onDragEnd={endDrag}
                    onDragOver={(event) => {
                      if (!dragging || dragging === span.id) return;
                      event.preventDefault();
                      if (dropTarget !== span.id) setDropTarget(span.id);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (dragging) move(tab, dragging, span.id);
                      endDrag();
                    }}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl border bg-surface px-2.5 py-2 transition-[border-color,box-shadow,opacity] duration-150',
                      isTarget ? 'border-primary border-dashed shadow-lift' : 'border-line',
                      isDragging && 'opacity-45',
                    )}
                  >
                    <button
                      type="button"
                      data-card={span.id}
                      aria-label={`拖动 ${nameOf(span.id)} 排序`}
                      title="按住拖动排序"
                      className={cn(
                        'shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-bg-soft hover:text-primary',
                        canWrite ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed opacity-40',
                      )}
                      disabled={!canWrite}
                      onPointerDown={() => canWrite && setArmed(span.id)}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      onKeyDown={(event) => {
                        // 键盘用户也能排序：把手上直接接上下键
                        if (event.key === 'ArrowUp') step(tab, span.id, -1);
                        if (event.key === 'ArrowDown') step(tab, span.id, 1);
                      }}
                    >
                      <Icon name="grip" size={16} />
                    </button>

                    <span className="w-5 shrink-0 text-center font-mono text-[11px] text-muted">{index + 1}</span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium leading-snug text-ink">
                        {nameOf(span.id)}
                      </span>
                      <span className="block truncate font-mono text-[10.5px] leading-snug text-muted">
                        {span.id} · {pathOf(span.id)}
                      </span>
                    </span>

                    <span className="flex shrink-0 items-center gap-1.5">
                      <Select
                        aria-label={`${nameOf(span.id)} 占用列数`}
                        options={COL_OPTIONS}
                        value={String(span.cols)}
                        onChange={(event) => setSpan(tab, span.id, 'cols', Number(event.target.value))}
                        disabled={!canWrite}
                        className="h-8 w-[68px] text-[12px]"
                      />
                      <span aria-hidden className="text-[11px] text-muted">
                        ×
                      </span>
                      <Select
                        aria-label={`${nameOf(span.id)} 占用行数`}
                        options={ROW_OPTIONS}
                        value={String(span.rows)}
                        onChange={(event) => setSpan(tab, span.id, 'rows', Number(event.target.value))}
                        disabled={!canWrite}
                        className="h-8 w-[68px] text-[12px]"
                      />
                    </span>

                    <span className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        aria-label={`把 ${nameOf(span.id)} 上移`}
                        className="rounded-md p-1 text-muted hover:bg-bg-soft hover:text-primary disabled:opacity-35"
                        disabled={!canWrite || index === 0}
                        onClick={() => step(tab, span.id, -1)}
                      >
                        <Icon name="arrow-up" size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label={`把 ${nameOf(span.id)} 下移`}
                        className="rounded-md p-1 text-muted hover:bg-bg-soft hover:text-primary disabled:opacity-35"
                        disabled={!canWrite || index === rows.length - 1}
                        onClick={() => step(tab, span.id, 1)}
                      >
                        <Icon name="arrow-up" size={15} className="rotate-180" />
                      </button>
                      {tab === 'live' && (
                        <button
                          type="button"
                          aria-label={`把 ${nameOf(span.id)} 从首页移除`}
                          className="rounded-md p-1 text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-35"
                          disabled={!canWrite}
                          onClick={() => removeFromHome(span.id)}
                        >
                          <Icon name="close" size={15} />
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          {tab === 'live' && (
            <div className="mt-4 flex items-center gap-2 border-t border-dashed border-line pt-4">
              <Select
                aria-label="选择要加入首页的接口"
                placeholder={unadded.length > 0 ? '选择接口…' : '全部接口都已在首页展示'}
                options={unadded.map((item: ApiCatalogItem) => ({ value: item.id, label: `${item.name} ${item.path}` }))}
                value={pickSlug}
                onChange={(event) => setPickSlug(event.target.value)}
                disabled={!canWrite || unadded.length === 0}
                className="min-w-[220px] flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => addToHome(pickSlug)}
                disabled={!canWrite || !pickSlug}
              >
                加入首页
              </Button>
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
          <PanelTitle
            title="布局预览"
            description={`只示意行列占位与顺序，不渲染卡片内容；编号与左侧列表一一对应。`}
          />
          <LayoutPreview layout={rows} nameOf={nameOf} />
          <p className="mb-0 text-[11.5px] leading-relaxed text-muted">
            {tab === 'live'
              ? `首页从 md 断点起按 ${CARD_GRID_COLS} 列铺开，一行占不满会自动上提，所以列数相加为 ${CARD_GRID_COLS} 的倍数最整齐。`
              : '广场窄屏会塌缩到两列，预览里的列数只作相对参考。'}
          </p>
        </div>
      </div>
    </div>
  );
}

/** 恒按 12 列铺开，不像前台那样塌缩，小屏里也能看清行列 */
function LayoutPreview({ layout, nameOf }: { layout: readonly CardSpan[]; nameOf: (id: string) => string }) {
  return (
    <div className="grid grid-cols-12 gap-1.5 rounded-lg border border-dashed border-line bg-bg-soft p-2">
      {layout.map((span, index) => (
        <div
          key={span.id}
          className="flex min-h-[42px] flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md border border-line bg-surface px-1.5 text-center"
          style={{
            gridColumn: `span ${span.cols} / span ${span.cols}`,
            gridRow: `span ${span.rows} / span ${span.rows}`,
          }}
        >
          <span className="w-full truncate text-[11.5px] font-medium text-ink">{nameOf(span.id)}</span>
          <span className="font-mono text-[10px] text-muted">
            {index + 1} · {span.cols}×{span.rows}
          </span>
        </div>
      ))}
    </div>
  );
}

function LayoutSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-9 w-52" />
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,360px)] gap-5 max-xl:grid-cols-1">
        <Panel className="flex flex-col gap-2 p-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </Panel>
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

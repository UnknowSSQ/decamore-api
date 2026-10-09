'use client';
/** 整页聚合提交：字段间有联动（开维护模式得配说明语），跨字段校验只能一次做完 */
import { useEffect, useState } from 'react';

import { Button, Callout, Field, Input, Panel, PageHeader, PanelTitle, SettingRow, Skeleton, EmptyState } from '@/components/ui';
import { Select } from '@/components/ui/Select';
import { Switch, Textarea } from '@/components/ui/Input';
import { useRequest } from '@/hooks/useRequest';
import { useCan } from '@/hooks/usePermission';
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
} from '@/constants/card-layout';
import { cn } from '@/utils/cn';
import type { CardSpan, SiteSettings } from '@/types';

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Shanghai', label: '中国标准时间 (UTC+8)' },
  { value: 'Asia/Tokyo', label: '日本标准时间 (UTC+9)' },
  { value: 'America/New_York', label: '美国东部时间 (UTC-5)' },
  { value: 'Europe/London', label: '格林威治标准时间 (UTC+0)' },
];

const DATE_FORMAT_OPTIONS = [
  { value: 'iso', label: 'ISO 8601 (2026-10-07)' },
  { value: 'cn', label: '中文格式 (2026年10月07日)' },
  { value: 'us', label: '美式格式 (10/07/2026)' },
];

const ITEMS_PER_PAGE_OPTIONS = [
  { value: '12', label: '12 条' },
  { value: '24', label: '24 条' },
  { value: '48', label: '48 条' },
];

const AUTO_REFRESH_OPTIONS = [
  { value: '0', label: '关闭' },
  { value: '5', label: '5 秒' },
  { value: '10', label: '10 秒' },
  { value: '30', label: '30 秒' },
];

/** 选项由 CARD_*_RANGE 派生，边界和 Zod 校验同源 */
function spanOptions(range: { min: number; max: number }, unit: string) {
  return Array.from({ length: range.max - range.min + 1 }, (_, index) => {
    const value = range.min + index;
    return { value: String(value), label: `${value} ${unit}` };
  });
}

const CARD_COL_OPTIONS = spanOptions(CARD_COLS_RANGE, '列');
const CARD_ROW_OPTIONS = spanOptions(CARD_ROWS_RANGE, '行');

export function SettingsView() {
  const canWrite = useCan('settings:write');
  const toast = useToast();

  const { data, loading, error, refetch } = useRequest(fetchSiteSettings, { immediate: true });

  // 接口车单：首页卡片的候选成员与名称标签都读它（后台改名后这里同步）
  const { data: catalogData } = useRequest(fetchPlazaCatalog, { immediate: true });
  const [pickSlug, setPickSlug] = useState('');

  const [form, setForm] = useState<SiteSettings | null>(null);
  const [dirty, setDirty] = useState<Set<keyof SiteSettings>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SiteSettings, string>>>({});

  // data 一刷新就丢弃本地改动，保存后的最终值以服务端为准
  useEffect(() => {
    if (data) {
      setForm(data);
      setDirty(new Set());
      setFieldErrors({});
    }
  }, [data]);

  // 改动即进脏集合，同时清掉这个字段的旧报错
  const updateField = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    if (!form || !canWrite) return;
    setForm({ ...form, [key]: value });
    setDirty((prev) => new Set(prev).add(key));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  // 单张卡片的跨度更新：整组作为脏字段提交（后端按数组整体覆盖）
  const updateCardSpan = (
    field: 'liveCardLayout' | 'plazaCardLayout',
    id: string,
    key: 'cols' | 'rows',
    value: number,
  ) => {
    if (!form) return;
    updateField(
      field,
      form[field].map((span) => (span.id === id ? { ...span, [key]: value } : span)),
    );
  };

  /** 卡片显示名：车单优先，车单还没回来时回落静态目录 */
  const nameOf = (id: string) =>
    catalogData?.items.find((item) => item.id === id)?.name ?? cardName(id);

  // 首页卡片成员增删：liveCardLayout 的数组顺序就是首页排列顺序，新卡片默认 4 列 1 行
  const addLiveCard = (id: string) => {
    if (!form || !id || form.liveCardLayout.some((span) => span.id === id)) return;
    updateField('liveCardLayout', [...form.liveCardLayout, { id, cols: 4, rows: 1 }]);
    setPickSlug('');
  };

  const removeLiveCard = (id: string) => {
    if (!form) return;
    updateField('liveCardLayout', form.liveCardLayout.filter((span) => span.id !== id));
  };

  const handleReset = () => {
    if (!data) return;
    setForm(data);
    setDirty(new Set());
    setFieldErrors({});
    toast.success('已重置');
  };

  const handleSave = async () => {
    if (!form || dirty.size === 0 || !canWrite) return;

    const patch: Partial<SiteSettingsPatchInput> = {};
    for (const key of dirty) {
      (patch as Record<string, unknown>)[key] = form[key];
    }

    const parseResult = siteSettingsPatchSchema.safeParse(patch);
    if (!parseResult.success) {
      const issues = parseResult.error.issues;
      const errors: Partial<Record<keyof SiteSettings, string>> = {};
      for (const issue of issues) {
        // patch 是嵌套结构，只取最外层字段名当错误归属
        const field = issue.path[0] as keyof SiteSettings;
        if (field) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      toast.error('请检查表单错误');
      return;
    }

    try {
      await patchSiteSettings(parseResult.data);
      toast.success('已保存');
      setDirty(new Set());
      // PATCH 的响应没接进 useRequest，改完统一 refetch
      await refetch();
    } catch {
      toast.error('保存失败');
    }
  };

  // 未保存就离页会丢改动；effect 不在服务端执行，这里的 window 判空是防御
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (dirty.size === 0) return;

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty.size]);

  if (loading) return <SettingsSkeleton />;
  if (error || !form) {
    return (
      <EmptyState
        title="加载失败"
        description="无法获取网站设置，请重试。"
        action={<Button onClick={() => refetch()}>重试</Button>}
      />
    );
  }

  // 广场布局行：以车单为准（后台新增接口会自动进入编辑列表），车单未到位时回落已保存跨度
  const plazaIds = catalogData?.items.length
    ? catalogData.items.map((item) => item.id)
    : form.plazaCardLayout.map((span) => span.id);
  const plazaRows = plazaIds.map((id) => ({ id, span: cardSpan(form.plazaCardLayout, id, PLAZA_CARD_DEFAULT_SPAN) }));

  const setPlazaSpan = (id: string, key: 'cols' | 'rows', value: number) => {
    updateField(
      'plazaCardLayout',
      plazaRows.map((row) => (row.id === id ? { ...row.span, [key]: value } : row.span)),
    );
  };

  const unselectedLive = (catalogData?.items ?? []).filter(
    (item) => !form.liveCardLayout.some((span) => span.id === item.id),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="网站设置"
        description="前台展示、公告、维护计划与缓存策略 · 保存后 30 秒内全节点生效"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} disabled={dirty.size === 0}>
              重置
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={dirty.size === 0 || !canWrite}>
              保存变更
            </Button>
          </div>
        }
      />

      {!canWrite && (
        <Callout tone="warn" mark="!">
          <strong>只读模式：</strong>当前角色无权修改网站设置，如需调整请联系管理员。
        </Callout>
      )}

      <div className="grid grid-cols-2 gap-6">
        <Panel>
          <PanelTitle title="站点信息" />
          <div className="mt-4 flex flex-col gap-4">
            <Field label="站点名称" hint="将展示在前台导航" error={fieldErrors.siteName}>
              <Input
                value={form.siteName}
                onChange={(e) => updateField('siteName', e.target.value)}
                disabled={!canWrite}
                invalid={!!fieldErrors.siteName}
                maxLength={40}
              />
            </Field>

            <Field label="站点描述" hint="用于 SEO 与分享卡片" error={fieldErrors.siteDescription}>
              <Textarea
                value={form.siteDescription}
                onChange={(e) => updateField('siteDescription', e.target.value)}
                disabled={!canWrite}
                invalid={!!fieldErrors.siteDescription}
                maxLength={120}
                rows={3}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="联系邮箱" error={fieldErrors.contactEmail}>
                <Input
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => updateField('contactEmail', e.target.value)}
                  disabled={!canWrite}
                  invalid={!!fieldErrors.contactEmail}
                />
              </Field>

              <Field label="版权署名" error={fieldErrors.icp}>
                <Input
                  value={form.icp}
                  onChange={(e) => updateField('icp', e.target.value)}
                  disabled={!canWrite}
                  invalid={!!fieldErrors.icp}
                  maxLength={40}
                />
              </Field>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelTitle title="功能开关" />
          <div className="mt-4 flex flex-col gap-4">
            <SettingRow title="评论功能" description="启用接口评论与讨论区。">
              <Switch
                checked={form.enableComments}
                onChange={(v) => updateField('enableComments', v)}
                disabled={!canWrite}
              />
            </SettingRow>
          </div>
        </Panel>

        <Panel>
          <PanelTitle
            title="维护模式"
            extra={
              <Switch
                checked={form.maintenanceMode}
                onChange={(v) => updateField('maintenanceMode', v)}
                disabled={!canWrite}
              />
            }
          />
          <div className="mt-4 flex flex-col gap-4">
            <Field label="维护说明" hint="展示在 503 维护页" error={fieldErrors.maintenanceMessage}>
              <Textarea
                value={form.maintenanceMessage}
                onChange={(e) => updateField('maintenanceMessage', e.target.value)}
                disabled={!canWrite}
                invalid={!!fieldErrors.maintenanceMessage}
                maxLength={200}
                rows={3}
              />
            </Field>

            <Callout tone="warn" mark="※" size="sm">
              <strong>影响范围：</strong>开启后所有接口调用统一返回 503，控制台与文档不受影响。
            </Callout>
          </div>
        </Panel>

        <Panel>
          <PanelTitle title="时间与显示" />
          <div className="mt-4 flex flex-col gap-4">
            <SettingRow title="时区" description="全站时间显示基准。">
              <Select
                options={TIMEZONE_OPTIONS}
                value={form.timezone}
                onChange={(e) => updateField('timezone', e.target.value)}
                disabled={!canWrite}
                className="w-48"
              />
            </SettingRow>

            <SettingRow title="日期格式" description="前台页面日期展示样式。">
              <Select
                options={DATE_FORMAT_OPTIONS}
                value={form.dateFormat}
                onChange={(e) => updateField('dateFormat', e.target.value as 'iso' | 'cn' | 'us')}
                disabled={!canWrite}
                className="w-48"
              />
            </SettingRow>

            <SettingRow title="每页条数" description="列表页默认展示条数。">
              <Select
                options={ITEMS_PER_PAGE_OPTIONS}
                value={String(form.itemsPerPage)}
                onChange={(e) => updateField('itemsPerPage', Number(e.target.value))}
                disabled={!canWrite}
                className="w-32"
              />
            </SettingRow>

            <SettingRow
              title="自动刷新"
              description="仪表盘等实时页面自动刷新间隔。"
            >
              <Select
                options={AUTO_REFRESH_OPTIONS}
                value={String(form.autoRefreshSec)}
                onChange={(e) => updateField('autoRefreshSec', Number(e.target.value))}
                disabled={!canWrite}
                className="w-32"
              />
            </SettingRow>
          </div>
        </Panel>

        <Panel className="col-span-2">
          <PanelTitle
            title="首页 Live 卡片布局"
            description={`首页「实时接口广场」展示哪些接口、每张卡占几列几行都在这里配置，按 ${CARD_GRID_COLS} 列网格排布；列表顺序即首页顺序，保存后首页即时生效。`}
          />
          <div className="mt-4 grid grid-cols-2 gap-6 max-xl:grid-cols-1">
            <div className="flex flex-col">
              {form.liveCardLayout.map((span) => (
                <SettingRow
                  key={span.id}
                  title={nameOf(span.id)}
                  description={`${span.id} · 当前占 ${span.cols} 列 × ${span.rows} 行`}
                >
                  <div className="flex items-center gap-2">
                    <Select
                      aria-label={`${nameOf(span.id)} 占用列数`}
                      options={CARD_COL_OPTIONS}
                      value={String(span.cols)}
                      onChange={(e) => updateCardSpan('liveCardLayout', span.id, 'cols', Number(e.target.value))}
                      disabled={!canWrite}
                      className="w-24"
                    />
                    <Select
                      aria-label={`${nameOf(span.id)} 占用行数`}
                      options={CARD_ROW_OPTIONS}
                      value={String(span.rows)}
                      onChange={(e) => updateCardSpan('liveCardLayout', span.id, 'rows', Number(e.target.value))}
                      disabled={!canWrite}
                      className="w-24"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLiveCard(span.id)}
                      disabled={!canWrite}
                      aria-label={`把 ${nameOf(span.id)} 从首页移除`}
                    >
                      移除
                    </Button>
                  </div>
                </SettingRow>
              ))}

              {/* 加入首页：候选来自接口车单，选了要先「保存变更」才写入 */}
              <div className="flex items-center gap-2 pt-4">
                <Select
                  aria-label="选择要加入首页的接口"
                  placeholder={unselectedLive.length > 0 ? '选择接口…' : '全部接口都已在首页展示'}
                  options={unselectedLive.map((item) => ({ value: item.id, label: `${item.name} ${item.path}` }))}
                  value={pickSlug}
                  onChange={(e) => setPickSlug(e.target.value)}
                  disabled={!canWrite || unselectedLive.length === 0}
                  className="min-w-[220px] flex-1"
                />
                <Button variant="outline" size="sm" onClick={() => addLiveCard(pickSlug)} disabled={!canWrite || !pickSlug}>
                  加入首页
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="mb-0 text-[11.5px] leading-relaxed text-muted">
                布局预览 · 只示意行列占位与排列顺序，不渲染卡片内容。
              </p>
              <CardLayoutPreview layout={form.liveCardLayout} nameOf={nameOf} />
              {fieldErrors.liveCardLayout && (
                <p role="alert" className="mb-0 text-[11.5px] leading-snug text-danger">
                  {fieldErrors.liveCardLayout}
                </p>
              )}
            </div>
          </div>
        </Panel>

        <Panel className="col-span-2">
          <PanelTitle
            title="接口广场卡片布局"
            description={`接口广场同样按 ${CARD_GRID_COLS} 列网格排布，可为每个接口单独设置占位；搜索与分类筛选命中时仍按接口 id 保持各自跨度。`}
          />
          <div className="mt-4 grid grid-cols-2 gap-x-6 max-xl:grid-cols-1">
            {plazaRows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 border-b border-dashed border-line py-2.5"
              >
                <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{nameOf(row.id)}</span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <Select
                    aria-label={`${nameOf(row.id)} 占用列数`}
                    options={CARD_COL_OPTIONS}
                    value={String(row.span.cols)}
                    onChange={(e) => setPlazaSpan(row.id, 'cols', Number(e.target.value))}
                    disabled={!canWrite}
                    className="h-8 w-[70px] text-[12px]"
                  />
                  <span aria-hidden className="text-[11px] text-muted">
                    ×
                  </span>
                  <Select
                    aria-label={`${nameOf(row.id)} 占用行数`}
                    options={CARD_ROW_OPTIONS}
                    value={String(row.span.rows)}
                    onChange={(e) => setPlazaSpan(row.id, 'rows', Number(e.target.value))}
                    disabled={!canWrite}
                    className="h-8 w-[70px] text-[12px]"
                  />
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <p className="mb-0 text-[11.5px] leading-relaxed text-muted">
              布局预览 · 展示当前 {plazaRows.length} 张卡片的行列占位，不含卡片内容。
            </p>
            <CardLayoutPreview layout={plazaRows.map((row) => row.span)} nameOf={nameOf} cellClassName="min-h-[38px]" />
            {fieldErrors.plazaCardLayout && (
              <p role="alert" className="mb-0 text-[11.5px] leading-snug text-danger">
                {fieldErrors.plazaCardLayout}
              </p>
            )}
          </div>
        </Panel>
      </div>

      <div className="text-center text-[11px] text-muted">
        配置变更后约 30 秒内全节点生效 · 维护模式与公告变更会即时推送至前台
      </div>
    </div>
  );
}

/** 恒按 12 列铺开，不像前台那样塌缩，小屏里也能看清行列 */
function CardLayoutPreview({
  layout,
  cellClassName,
  nameOf,
}: {
  layout: readonly CardSpan[];
  cellClassName?: string;
  /** 由调用方传入解析函数，后台改名才会同步到预览 */
  nameOf?: (id: string) => string;
}) {
  return (
    <div className="grid grid-cols-12 gap-1.5 rounded-lg border border-dashed border-line bg-bg-soft p-2">
      {layout.map((span) => (
        <div
          key={span.id}
          className={cn(
            'flex min-h-[46px] flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md border border-line bg-surface px-1.5 text-center',
            cellClassName,
          )}
          style={{
            gridColumn: `span ${span.cols} / span ${span.cols}`,
            gridRow: `span ${span.rows} / span ${span.rows}`,
          }}
        >
          <span className="w-full truncate text-[11.5px] font-medium text-ink">
            {(nameOf ?? cardName)(span.id)}
          </span>
          <span className="font-mono text-[10px] text-muted">
            {span.cols}×{span.rows}
          </span>
        </div>
      ))}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Panel key={i}>
            <Skeleton className="h-6 w-40" />
            <div className="mt-4 flex flex-col gap-4">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-12" />
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

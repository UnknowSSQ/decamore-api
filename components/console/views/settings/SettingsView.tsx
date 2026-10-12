'use client';
/** 整页聚合提交：字段间有联动（开维护模式得配说明语），跨字段校验只能一次做完 */
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button, Callout, Field, Input, Panel, PageHeader, PanelTitle, SettingRow, Skeleton, EmptyState } from '@/components/ui';
import { ROUTES } from '@/constants/app';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Input';
import { useRequest } from '@/hooks/useRequest';
import { useCan } from '@/hooks/usePermission';
import { useToast } from '@/hooks/useToast';
import { fetchSiteSettings, patchSiteSettings } from '@/lib/api';
import { siteSettingsPatchSchema, type SiteSettingsPatchInput } from '@/lib/zod/admin.schema';
import { API_CATALOG } from '@/constants/api-catalog';
import type { SiteSettings } from '@/types';

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

export function SettingsView() {
  const canWrite = useCan('settings:write');
  const toast = useToast();

  const { data, loading, error, refetch } = useRequest(fetchSiteSettings, { immediate: true });

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

  // 单张卡片的跨度与顺序在「卡片布局」页编辑，这里只管其余站点级设置

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

  return (

    <div className="flex flex-col gap-6">
      <PageHeader
        title="网站设置"
        description="页脚信息、维护模式与时间显示口径 · 卡片布局已单独成页"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={ROUTES.adminCards}
              className="text-[12.5px] font-medium text-primary hover:underline"
            >
              去卡片布局
            </Link>
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
          <PanelTitle title="站点信息" description="页脚展示的联系方式与备案号" />
          <div className="mt-4 flex flex-col gap-4">
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

              <Field label="备案号" error={fieldErrors.icp}>
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
            <Callout tone="warn" mark="※" size="sm">
              <strong>影响范围：</strong>开启后 {API_CATALOG.length} 个公开接口统一返回 503，控制台与文档页不受影响；
              控制台顶部同时挂出维护横幅。
            </Callout>
          </div>
        </Panel>

        <Panel>
          <PanelTitle title="时间与显示" />

          <div className="mt-4 flex flex-col gap-4">
            <SettingRow title="时区" description="控制台时钟、日志与仪表盘时间的基准时区。">
              <Select
                options={TIMEZONE_OPTIONS}
                value={form.timezone}
                onChange={(e) => updateField('timezone', e.target.value)}
                disabled={!canWrite}
                className="w-48"
              />
            </SettingRow>

            <SettingRow title="日期格式" description="日志与列表里日期部分的渲染样式。">
              <Select
                options={DATE_FORMAT_OPTIONS}
                value={form.dateFormat}
                onChange={(e) => updateField('dateFormat', e.target.value as 'iso' | 'cn' | 'us')}
                disabled={!canWrite}
                className="w-48"
              />
            </SettingRow>

            <SettingRow title="每页条数" description="接口 / 规则 / 日志列表的默认每页条数。">
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

      </div>

      <div className="text-center text-[11px] text-muted">
        配置变更后约 30 秒内全节点生效 · 维护模式与公告变更会即时推送至前台
      </div>
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

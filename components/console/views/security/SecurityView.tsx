'use client';
/** 改一项就 PATCH：安全项彼此独立，等整页保存反而拖慢生效 */
import { useEffect, useState } from 'react';

import { Button, Callout, Icon, Input, Panel, PageHeader, PanelTitle, SettingRow, Skeleton, EmptyState } from '@/components/ui';
import { Select } from '@/components/ui/Select';
import { useRequest } from '@/hooks/useRequest';
import { useCan } from '@/hooks/usePermission';
import { useToast } from '@/hooks/useToast';
import { fetchSecurity, patchSecurity, saveIpWhitelist, removeIpWhitelist, saveIpBlacklist, removeIpBlacklist, saveCorsOrigins } from '@/lib/api';
import { ipOrCidrSchema, corsOriginSchema } from '@/lib/zod/common';
import type { SecuritySettings } from '@/types';

/** 频控窗口的可选项，value 就是秒数；与 securityPatchSchema 的 periodSec 范围一致 */
const PERIOD_OPTIONS = [
  { value: '60', label: '1 分钟' },
  { value: '300', label: '5 分钟' },
  { value: '3600', label: '1 小时' },
];

export function SecurityView() {
  const canWrite = useCan('security:write');
  const toast = useToast();

  const { data, loading, error, refetch } = useRequest(fetchSecurity, { immediate: true });

  // 复制一份到本地：乐观改动要能就地回滚，data 只在 refetch 后才刷新
  const [localData, setLocalData] = useState<SecuritySettings | null>(null);

  useEffect(() => {
    if (data) setLocalData(data);
  }, [data]);

  /** 乐观提交的唯一入口：先落本地，失败退回提交前的快照 */
  const commit = async (next: SecuritySettings, patch: Partial<SecuritySettings>) => {
    if (!localData || !canWrite) return;

    const prev = localData;
    setLocalData(next);
    try {
      await patchSecurity(patch);
      toast.success('已保存');
    } catch {
      setLocalData(prev);
      toast.error('保存失败');
    }
  };

  const updateField = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
    if (!localData) return;
    return commit({ ...localData, [key]: value }, { [key]: value });
  };

  if (loading) return <SecuritySkeleton />;
  if (error || !localData) {
    return (
      <EmptyState
        title="加载失败"
        description="无法获取安全配置，请重试。"
        action={<Button onClick={() => refetch()}>重试</Button>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="安全配置"
        description="访问控制与流量防护"
      />

      <Callout tone="info" mark="i">
        这里的每一项都直接参与请求链路判定：IP 黑白名单与访问规则在守卫里执行，
        请求体上限传给 body 解析，全局限额按来源 IP 计数，CORS 只在来源命中时下发响应头。
      </Callout>

      {!canWrite && (
        <Callout tone="warn" mark="!">
          <strong>只读模式：</strong>当前角色无权修改安全配置，如需调整请联系管理员。
        </Callout>
      )}

      <div className="grid grid-cols-2 gap-6">
        <Panel>
          <PanelTitle title="流量防护" />
          <div className="mt-4 flex flex-col gap-4">
            <SettingRow
              title="全局速率限制"
              description="按来源 IP 计的请求上限，超出返回 429。"
            >
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  // step 要能整除到默认值 5000：用 60 的话滑杆会显示成 4980，与右侧数字不一致
                  min={60}
                  max={6000}
                  step={20}
                  value={localData.globalRateLimit.limit}
                  onChange={(e) =>
                    updateField('globalRateLimit', { ...localData.globalRateLimit, limit: Number(e.target.value) })
                  }
                  disabled={!canWrite}
                  className="w-32"
                />
                <span className="w-20 text-right text-[12px] text-ink">{localData.globalRateLimit.limit} 次</span>
              </div>
            </SettingRow>

            <SettingRow
              title="限速窗口"
              description="上面的次数在这个时长内累计，窗口走完后重新计数。"
            >
              <Select
                options={PERIOD_OPTIONS}
                value={String(localData.globalRateLimit.periodSec)}
                onChange={(e) =>
                  updateField('globalRateLimit', { ...localData.globalRateLimit, periodSec: Number(e.target.value) })
                }
                disabled={!canWrite}
                className="w-32"
              />
            </SettingRow>

            <SettingRow
              title="请求体上限"
              description="单个请求的最大字节数（KB）。"
            >
              <Input
                type="number"
                value={localData.maxBodySizeKb}
                onChange={(e) => updateField('maxBodySizeKb', Number(e.target.value))}
                disabled={!canWrite}
                className="w-32"
                min={16}
                max={16384}
              />
            </SettingRow>
          </div>
        </Panel>

        <IpListEditor
          title="IP 白名单"
          description="控制台仅允许以下来源访问，留空表示不限制。"
          items={localData.ipWhitelist}
          onAdd={(ip) => handleAddIp('whitelist', ip)}
          onRemove={(ip) => handleRemoveIp('whitelist', ip)}
          placeholder="例如 203.0.113.0/24"
          addButtonLabel="添加"
          canWrite={canWrite}
          callout={
            <Callout tone="warn" mark="※" size="sm">
              <strong>注意：</strong>办公网出口变更频繁，建议以网段形式授权并定期复核。
            </Callout>
          }
        />

        <IpListEditor
          title="IP 黑名单"
          description="命中即拒绝，优先级高于白名单与限流规则。"
          items={localData.ipBlacklist}
          onAdd={(ip) => handleAddIp('blacklist', ip)}
          onRemove={(ip) => handleRemoveIp('blacklist', ip)}
          placeholder="输入需要封禁的 IP"
          addButtonLabel="封禁"
          canWrite={canWrite}
        />

        <Panel>
          <PanelTitle
            title="CORS 允许来源"
            description="浏览器端跨域调用白名单。"
          />
          <div className="mt-4 flex flex-col gap-3">
            <TagList
              tags={localData.corsOrigins}
              onRemove={(origin) => handleRemoveCors(origin)}
              canWrite={canWrite}
            />
            <TagAddForm
              placeholder="https://your-domain.com"
              addButtonLabel="添加"
              onAdd={(origin) => handleAddCors(origin)}
              canWrite={canWrite}
              validate={(v) => corsOriginSchema.safeParse(v).success}
            />
          </div>
        </Panel>

        <Panel>
          <PanelTitle title="管理员登录历史" />
          <div className="mt-4">
            <EmptyState mark="⌕" title="【待开发】登录历史" description="登录历史查询功能待实现。" />
          </div>
        </Panel>

        <Panel className="col-span-2">
          <PanelTitle
            title="管理操作审计"
            description="谁在什么时间改了什么"
          />
          <div className="mt-4">
            <EmptyState mark="⌕" title="【待开发】审计日志" description="审计日志查询功能待实现。" />
          </div>
        </Panel>
      </div>
    </div>
  );

  // 函数声明会提升，所以写在 return 之后也能被上面的 JSX 引用
  async function handleAddIp(type: 'whitelist' | 'blacklist', ip: string) {
    if (!localData || !canWrite) return;
    const parseResult = ipOrCidrSchema.safeParse(ip);
    if (!parseResult.success) {
      toast.error('IP 格式不正确');
      return;
    }

    const prev = localData;
    const newList = type === 'whitelist' ? [...localData.ipWhitelist, ip] : [...localData.ipBlacklist, ip];
    setLocalData(type === 'whitelist' ? { ...localData, ipWhitelist: newList } : { ...localData, ipBlacklist: newList });

    try {
      if (type === 'whitelist') await saveIpWhitelist(newList);
      else await saveIpBlacklist(newList);
      toast.success('已添加');
    } catch {
      setLocalData(prev);
      toast.error('添加失败');
    }
  }

  async function handleRemoveIp(type: 'whitelist' | 'blacklist', ip: string) {
    if (!localData || !canWrite) return;

    const prev = localData;
    const newList = type === 'whitelist' ? localData.ipWhitelist.filter((i) => i !== ip) : localData.ipBlacklist.filter((i) => i !== ip);
    setLocalData(type === 'whitelist' ? { ...localData, ipWhitelist: newList } : { ...localData, ipBlacklist: newList });

    try {
      if (type === 'whitelist') await removeIpWhitelist(ip);
      else await removeIpBlacklist(ip);
      toast.success('已移除');
    } catch {
      setLocalData(prev);
      toast.error('移除失败');
    }
  }

  async function handleAddCors(origin: string) {
    if (!localData || !canWrite) return;
    const parseResult = corsOriginSchema.safeParse(origin);
    if (!parseResult.success) {
      toast.error('来源格式不正确');
      return;
    }

    const prev = localData;
    const newList = [...localData.corsOrigins, origin];
    setLocalData({ ...localData, corsOrigins: newList });

    try {
      await saveCorsOrigins(newList);
      toast.success('已添加');
    } catch {
      setLocalData(prev);
      toast.error('添加失败');
    }
  }

  async function handleRemoveCors(origin: string) {
    if (!localData || !canWrite) return;

    const prev = localData;
    const newList = localData.corsOrigins.filter((o) => o !== origin);
    setLocalData({ ...localData, corsOrigins: newList });

    try {
      await saveCorsOrigins(newList);
      toast.success('已移除');
    } catch {
      setLocalData(prev);
      toast.error('移除失败');
    }
  }
}

function TagList({ tags, onRemove, canWrite }: { tags: string[]; onRemove: (tag: string) => void; canWrite: boolean }) {
  if (tags.length === 0) {
    return <div className="text-[11.5px] text-muted">未配置，按默认策略放行。</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-soft px-3 py-1 text-[11.5px] text-ink"
        >
          <span className="font-mono">{tag}</span>
          {canWrite && (
            <button
              type="button"
              onClick={() => onRemove(tag)}
              className="text-muted hover:text-danger"
              aria-label={`移除 ${tag}`}
            >
              <Icon name="close" size={12} />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

/** 校验规则由调用方注入，IP 段和 CORS 来源判的不是同一件事 */
function TagAddForm({
  placeholder,
  addButtonLabel,
  onAdd,
  canWrite,
  validate,
}: {
  placeholder: string;
  addButtonLabel: string;
  onAdd: (value: string) => void;
  canWrite: boolean;
  validate?: (value: string) => boolean;
}) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;

    if (validate && !validate(value.trim())) {
      setError('格式不正确');
      return;
    }

    onAdd(value.trim());
    setValue('');
    setError('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError('');
        }}
        placeholder={placeholder}
        disabled={!canWrite}
        invalid={!!error}
        className="flex-1"
      />
      <Button type="submit" variant="outline" size="sm" disabled={!canWrite || !value.trim()}>
        {addButtonLabel}
      </Button>
      {error && <span className="text-[11px] text-danger">{error}</span>}
    </form>
  );
}

function IpListEditor({
  title,
  description,
  items,
  onAdd,
  onRemove,
  placeholder,
  addButtonLabel,
  canWrite,
  callout,
}: {
  title: string;
  description: string;
  items: string[];
  onAdd: (ip: string) => void;
  onRemove: (ip: string) => void;
  placeholder: string;
  addButtonLabel: string;
  canWrite: boolean;
  callout?: React.ReactNode;
}) {
  return (
    <Panel>
      <PanelTitle title={title} description={description} />
      <div className="mt-4 flex flex-col gap-3">
        <TagList tags={items} onRemove={onRemove} canWrite={canWrite} />
        <TagAddForm
          placeholder={placeholder}
          addButtonLabel={addButtonLabel}
          onAdd={onAdd}
          canWrite={canWrite}
          validate={(v) => ipOrCidrSchema.safeParse(v).success}
        />
        {callout}
      </div>
    </Panel>
  );
}

function SecuritySkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
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

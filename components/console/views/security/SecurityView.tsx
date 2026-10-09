'use client';
/** 改一项就 PATCH：安全项彼此独立，等整页保存反而拖慢生效 */
import { useEffect, useState } from 'react';

import { Badge, Button, Callout, Icon, Input, Panel, PageHeader, PanelTitle, SettingRow, Skeleton, EmptyState } from '@/components/ui';
import { Select } from '@/components/ui/Select';
import { Switch, Checkbox } from '@/components/ui/Input';
import { useRequest } from '@/hooks/useRequest';
import { useCan } from '@/hooks/usePermission';
import { useToast } from '@/hooks/useToast';
import { fetchSecurity, patchSecurity, saveIpWhitelist, removeIpWhitelist, saveIpBlacklist, removeIpBlacklist, saveCorsOrigins } from '@/lib/api';
import { ipOrCidrSchema, corsOriginSchema } from '@/lib/zod/common';
import type { SecuritySettings } from '@/types';

const SESSION_OPTIONS = [
  { value: '30', label: '30 分钟' },
  { value: '60', label: '1 小时' },
  { value: '480', label: '8 小时' },
];

const LOCKOUT_OPTIONS = [
  { value: '3', label: '3 次' },
  { value: '5', label: '5 次' },
  { value: '10', label: '10 次' },
];

const CONCURRENCY_OPTIONS = [
  { value: '10', label: '10' },
  { value: '32', label: '32' },
  { value: '64', label: '64' },
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

  const updateField = async <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
    if (!localData || !canWrite) return;
    
    // 先落本地
    const prev = localData;
    setLocalData({ ...localData, [key]: value });

    try {
      await patchSecurity({ [key]: value } as Partial<SecuritySettings>);
      toast.success('已保存');
    } catch {
      setLocalData(prev);
      toast.error('保存失败');
    }
  };

  // path 形如 'passwordPolicy.minLength'，PATCH 按整个 parent 提交
  const updateNestedField = async (path: string, value: unknown) => {
    if (!localData || !canWrite) return;
    
    const [parent, child] = path.split('.');
    if (!parent || !child) return;

    const prev = localData;
    const parentObj = localData[parent as keyof SecuritySettings] as Record<string, unknown> | undefined;
    if (!parentObj) return;

    setLocalData({ ...localData, [parent]: { ...parentObj, [child]: value } });

    try {
      await patchSecurity({ [parent]: { ...parentObj, [child]: value } } as Partial<SecuritySettings>);
      toast.success('已保存');
    } catch {
      setLocalData(prev);
      toast.error('保存失败');
    }
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
        description="认证策略、访问控制、流量防护与审计 · 变更即刻生效并记录在案"
        actions={<Badge tone="warn">2 条策略待复核</Badge>}
      />

      {!canWrite && (
        <Callout tone="warn" mark="!">
          <strong>只读模式：</strong>当前角色无权修改安全配置，如需调整请联系管理员。
        </Callout>
      )}

      <div className="grid grid-cols-2 gap-6">
        <Panel>
          <PanelTitle title="登录与认证" />
          <div className="mt-4 flex flex-col gap-4">
            <SettingRow
              title="两步验证（2FA）"
              description="管理员登录需输入 TOTP 动态码，离线恢复码共 10 枚。"
            >
              <Switch
                checked={localData.twoFactorEnabled}
                onChange={(v) => updateField('twoFactorEnabled', v)}
                disabled={!canWrite}
              />
            </SettingRow>

            <SettingRow
              title="会话空闲超时"
              description="超时未操作将自动登出控制台。"
            >
              <Select
                options={SESSION_OPTIONS}
                value={String(localData.sessionTimeoutMin)}
                onChange={(e) => updateField('sessionTimeoutMin', Number(e.target.value))}
                disabled={!canWrite}
                className="w-32"
              />
            </SettingRow>

            <SettingRow
              title="失败锁定"
              description="连续失败达阈值后锁定来源 15 分钟。"
            >
              <Select
                options={LOCKOUT_OPTIONS}
                value={String(localData.failedAttemptMax)}
                onChange={(e) => updateField('failedAttemptMax', Number(e.target.value))}
                disabled={!canWrite}
                className="w-32"
              />
            </SettingRow>

            <SettingRow
              title="密码最小长度"
              description="适用于所有控制台成员账号。"
            >
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={8}
                  max={20}
                  value={localData.passwordPolicy.minLength}
                  onChange={(e) => updateNestedField('passwordPolicy.minLength', Number(e.target.value))}
                  disabled={!canWrite}
                  className="w-32"
                />
                <span className="w-12 text-right text-[12px] text-ink">{localData.passwordPolicy.minLength} 位</span>
              </div>
            </SettingRow>

            <SettingRow
              title="密码复杂度"
              description="强制要求包含的字符类型。"
            >
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={localData.passwordPolicy.requireUpper}
                  onChange={(e) => updateNestedField('passwordPolicy.requireUpper', e.target.checked)}
                  disabled={!canWrite}
                  label="大写"
                />
                <Checkbox
                  checked={localData.passwordPolicy.requireDigit}
                  onChange={(e) => updateNestedField('passwordPolicy.requireDigit', e.target.checked)}
                  disabled={!canWrite}
                  label="数字"
                />
                <Checkbox
                  checked={localData.passwordPolicy.requireSymbol}
                  onChange={(e) => updateNestedField('passwordPolicy.requireSymbol', e.target.checked)}
                  disabled={!canWrite}
                  label="符号"
                />
              </div>
            </SettingRow>
          </div>
        </Panel>

        <Panel>
          <PanelTitle title="流量防护" />
          <div className="mt-4 flex flex-col gap-4">
            <SettingRow
              title="全局速率限制"
              description="按来源 IP 每分钟请求上限，超出返回 429。"
            >
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={60}
                  max={6000}
                  step={60}
                  value={localData.globalRateLimit.limit}
                  onChange={(e) =>
                    updateField('globalRateLimit', { ...localData.globalRateLimit, limit: Number(e.target.value) })
                  }
                  disabled={!canWrite}
                  className="w-32"
                />
                <span className="w-20 text-right text-[12px] text-ink">{localData.globalRateLimit.limit} RPM</span>
              </div>
            </SettingRow>

            <SettingRow
              title="单 IP 并发上限"
              description="同一来源 IP 的并行连接数上限。"
            >
              <Select
                // 复用 periodSec：配置里没有独立的并发字段
                options={CONCURRENCY_OPTIONS}
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

            <SettingRow
              title="WAF 防护"
              description="Web 应用防火墙，拦截常见攻击。"
            >
              <Switch
                checked={localData.wafEnabled}
                onChange={(v) => updateField('wafEnabled', v)}
                disabled={!canWrite}
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
          footnote={<>近 7 日自动封禁 <strong>17</strong> 个异常来源</>}
        />

        <Panel>
          <PanelTitle
            title="CORS 允许来源"
            description="浏览器端跨域调用白名单。"
            extra={
              <label className="flex items-center gap-2 text-[12px] text-muted">
                <Switch
                  checked={true} // 【待开发】从 localData 读取
                  onChange={() => toast.info('【待开发】CORS 凭证开关')}
                  disabled={!canWrite}
                />
                <span>允许携带凭证</span>
              </label>
            }
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
            description="谁在什么时间改了什么 · 不可篡改，保留 180 天"
            extra={
              <Button variant="outline" size="sm" trailing="↗">
                导出审计记录
              </Button>
            }
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
  footnote,
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
  footnote?: React.ReactNode;
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
        {footnote && <div className="text-[11px] text-muted">{footnote}</div>}
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

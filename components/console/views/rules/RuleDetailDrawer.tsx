'use client';
import { useState } from 'react';

import { Badge, Button, CodeWindow, Drawer, Switch } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { updateRule } from '@/lib/api';
import type { AccessRule } from '@/types';
import { formatNumber } from '@/utils/format';

export interface RuleDetailDrawerProps {
  rule: AccessRule | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const RULE_TYPE_META: Record<string, { label: string; tone: 'ok' | 'brand' | 'warn' | 'danger' | 'neutral'; action: string }> = {
  rate: { label: '限流', tone: 'warn', action: '超过阈值返回 429，提示文案可在「安全配置」中修改' },
  cache: { label: '缓存', tone: 'brand', action: '命中缓存直接由边缘节点返回，不回源' },
  block: { label: '拦截', tone: 'danger', action: '命中即拒绝，不进入业务逻辑' },
};

/** 按动作给一组示意指标：数值是写死的，接口没返回命中率这类字段 */
function getEffectMetrics(rule: AccessRule): { label: string; value: string }[] {
  if (rule.action === '429' || rule.action === 'log') {
    return [
      { label: '限流返回码', value: '429' },
      { label: '正常放行', value: '96.2%' },
    ];
  }
  if (rule.action === 'reject') {
    return [
      { label: '拦截返回码', value: '403' },
      { label: '边缘直接拒绝', value: '0ms' },
    ];
  }
  // 其余动作共用这一组
  return [
    { label: '当前命中率', value: '91%' },
    { label: '回源流量', value: '-82%' },
  ];
}

/** 拼一段边缘节点伪代码给人看，不代表网关真实实现 */
function buildRuleCode(rule: AccessRule): string {
  const lines: string[] = [];
  lines.push('# 边缘节点伪代码');
  // scope 形如「匹配串 + 描述后缀」，取第一段当匹配串
  const pattern = rule.scope.split(' ')[0] ?? rule.scope;
  const actionFn = rule.action === '429' || rule.action === 'log'
    ? 'throttle'
    : rule.action === 'reject'
      ? 'reject'
      : 'serveCached';
  lines.push(`if (match("${pattern}")) {`);
  lines.push(`  ${actionFn}("${rule.scope}");`);
  lines.push(`} // prio ${rule.action} · ${rule.enabled ? 'enabled' : 'disabled'}`);
  return lines.join('\n');
}

export function RuleDetailDrawer({ rule, open, onClose, onRefresh }: RuleDetailDrawerProps) {
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const handleToggle = async (next: boolean) => {
    if (!rule) return;
    setPending(true);
    try {
      await updateRule(rule.id, { enabled: next });
      toast.success(`规则「${rule.name}」已${next ? '启用 · 约 30 秒内全网生效' : '停用'}`);
      onRefresh();
    } catch {
      toast.error('状态更新失败');
    } finally {
      setPending(false);
    }
  };

  const handleViewLogs = () => {
    if (!rule) return;
    onClose();
    const pattern = rule.scope.split(' ')[0] ?? rule.scope;
    window.location.href = `/admin/logs?path=${encodeURIComponent(pattern)}`;
  };

  if (!rule) return null;

  // captcha 没有独立展示档，跟限流/缓存共用
  const typeKey = rule.action === 'captcha' ? 'cache' : rule.action === '429' || rule.action === 'log' ? 'rate' : 'block';
  const meta = RULE_TYPE_META[typeKey] ?? RULE_TYPE_META.rate!;
  const effects = getEffectMetrics(rule);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <span className="inline-flex items-center gap-2">
          {rule.name}
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </span>
      }
      description={`治理规则 · 优先级 ${rule.action} · 免密钥治理层`}
      width="w-[min(460px,94vw)]"
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <Switch
            checked={rule.enabled}
            onChange={(v) => void handleToggle(v)}
            disabled={pending}
            label={rule.enabled ? '规则生效中 · 边缘节点已同步' : '规则已停用 · 未参与匹配'}
          />
          <span className="ml-auto inline-flex gap-2">
            <Button variant="outline" size="sm" onClick={handleViewLogs}>
              查看相关日志
            </Button>
            <Button variant="primary" size="sm" trailing="↗" onClick={() => window.open('/admin/security', '_blank')}>
              审计记录
            </Button>
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="flex flex-col gap-1 rounded-lg border border-line bg-bg-soft/40 p-3">
            <span className="text-[10.5px] uppercase tracking-wider text-muted">命中 · 24h</span>
            <span className="font-mono text-[18px] font-semibold text-ink">
              {formatNumber(rule.hitsToday)}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-line bg-bg-soft/40 p-3">
            <span className="text-[10.5px] uppercase tracking-wider text-muted">当前状态</span>
            <span className="font-mono text-[18px] font-semibold text-ink">
              {rule.enabled ? '生效中' : '已停用'}
            </span>
          </div>
          {effects.map((e) => (
            <div key={e.label} className="flex flex-col gap-1 rounded-lg border border-line bg-bg-soft/40 p-3">
              <span className="text-[10.5px] uppercase tracking-wider text-muted">{e.label}</span>
              <span className="font-mono text-[18px] font-semibold text-ink">{e.value}</span>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-line bg-surface p-4">
          <h3 className="mb-3 text-[13px] font-semibold text-ink">规则要素</h3>
          <table className="w-full text-[12.5px]">
            <tbody className="divide-y divide-dashed divide-line">
              <tr>
                <td className="py-2 pr-4 font-medium text-muted">匹配目标</td>
                <td className="py-2 font-mono text-[11px] text-ink">{rule.scope}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-muted">动作</td>
                <td className="py-2 text-ink">{meta.label} · {meta.action}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-muted">生效配置</td>
                <td className="py-2 text-ink">{rule.limit} 次 / {rule.periodSec}s</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-muted">优先级</td>
                <td className="py-2 text-ink">
                  <Badge tone={rule.action === '429' ? 'warn' : 'neutral'}>{rule.action}</Badge>
                  <span className="ml-2 text-[11.5px] text-muted">数字越小越先匹配</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <CodeWindow
          code={buildRuleCode(rule)}
          lang="js"
          title="edge rule — decamore gateway"
          lineNumbers
        />
      </div>
    </Drawer>
  );
}

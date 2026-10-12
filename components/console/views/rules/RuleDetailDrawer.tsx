'use client';
import { useState } from 'react';

import { Badge, Button, Drawer, Switch } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { updateRule } from '@/lib/api';
import type { AccessRule } from '@/types';
import { formatDate, formatNumber } from '@/utils/format';

export interface RuleDetailDrawerProps {
  rule: AccessRule | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const ACTION_META: Record<AccessRule['action'], { label: string; tone: 'warn' | 'danger' | 'neutral'; effect: string }> = {
  '429': { label: '限流', tone: 'warn', effect: '超出阈值返回 429，并带 Retry-After' },
  reject: { label: '拦截', tone: 'danger', effect: '命中即返回 403，不进入业务逻辑' },
  log: { label: '记录', tone: 'neutral', effect: '只记日志与命中数，不改变响应' },
};

/** 作用域可能带 /api/v1/* 这类通配，日志接口只认精确 path 或子串，所以按前缀走 keyword 检索 */
function scopeToLogQuery(scope: string): string {
  const first = scope.split(',')[0]?.trim() ?? scope;
  return first.replace(/\/?\*+$/, '').replace(/,$/, '');
}

export function RuleDetailDrawer({ rule, open, onClose, onRefresh }: RuleDetailDrawerProps) {
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const handleToggle = async (next: boolean) => {
    if (!rule) return;
    setPending(true);
    try {
      await updateRule(rule.id, { enabled: next });
      toast.success(`规则「${rule.name}」已${next ? '启用' : '停用'}`);
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
    window.location.href = `/admin/logs?keyword=${encodeURIComponent(scopeToLogQuery(rule.scope))}`;
  };

  if (!rule) return null;

  const meta = ACTION_META[rule.action];

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
      description={`访问规则 ${rule.id}`}
      width="w-[min(460px,94vw)]"
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <Switch
            checked={rule.enabled}
            onChange={(v) => void handleToggle(v)}
            disabled={pending}
            label={rule.enabled ? '已启用 · 参与请求判定' : '已停用 · 不参与匹配'}
          />
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={handleViewLogs}
          >
            查看相关日志
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1 rounded-lg border border-line bg-bg-soft/40 p-3">
            <span className="text-[10.5px] uppercase tracking-wider text-muted">今日命中</span>
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
          <div className="flex flex-col gap-1 rounded-lg border border-line bg-bg-soft/40 p-3">
            <span className="text-[10.5px] uppercase tracking-wider text-muted">限额</span>
            <span className="font-mono text-[18px] font-semibold text-ink">
              {rule.limit} / {rule.periodSec}s
            </span>
          </div>
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
                <td className="py-2 pr-4 font-medium text-muted">处置</td>
                <td className="py-2 text-ink">{meta.effect}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-muted">作用域优先级</td>
                <td className="py-2 text-ink">精确路径 &gt; 前缀 &gt; 多路径列表 &gt; global，同一路径只生效最具体的一条</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium text-muted">最近更新</td>
                <td className="py-2 text-ink">{formatDate(rule.updatedAt)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Drawer>
  );
}

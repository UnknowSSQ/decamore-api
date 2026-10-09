'use client';
import { useState } from 'react';

import { Button, CodeWindow, Drawer, MethodBadge, Switch } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { updateManagedApi } from '@/lib/api';
import { API_CATALOG } from '@/constants/api-catalog';
import { docApiHref } from '@/constants/app';
import type { ManagedApi } from '@/types';
import { formatNumber, formatPercent } from '@/utils/format';

export interface ApiDetailDrawerProps {
  api: ManagedApi | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

/** ManagedApi 类型里没有 description，只能按 path 回查静态目录 */
function findDesc(path: string): string {
  return API_CATALOG.find((c) => c.path === path)?.desc ?? '—';
}

/** curl 与响应体都是前端拼的示例骨架，不是后端返回的真实结构 */
function buildApiCode(api: ManagedApi): string {
  const lines: string[] = [];
  lines.push(`curl -X ${api.method} "https://api.decamore.dev${api.path}"`);
  lines.push('');
  lines.push(`# 响应 · ${api.method} ${api.path} · 200 OK`);
  lines.push('{');
  lines.push('  "statusCode": 200,');
  lines.push('  "data": { … },');
  lines.push(`  "elapsed": "${api.avgLatencyMs}ms"`);
  lines.push('}');
  return lines.join('\n');
}

export function ApiDetailDrawer({ api, open, onClose, onRefresh }: ApiDetailDrawerProps) {
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const isOnline = api?.status === 'online';

  const handleToggle = async (next: boolean) => {
    if (!api) return;
    setPending(true);
    try {
      // PATCH 的 schema 不认 status，只能宽松 cast 透传
      await updateManagedApi(api.id, {
        ...( { status: next ? 'online' : 'degraded' } as Record<string, unknown> ),
      } as Parameters<typeof updateManagedApi>[1]);
      toast.success(`「${api.name}」已${next ? '上线' : '转入维护'}`);
      onRefresh();
    } catch {
      toast.error('状态更新失败');
    } finally {
      setPending(false);
    }
  };

  const handleViewLogs = () => {
    if (!api) return;
    onClose();
    window.location.href = `/admin/logs?path=${encodeURIComponent(api.path)}`;
  };

  if (!api) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <span className="inline-flex items-center gap-2">
          {api.name}
          <MethodBadge method={api.method} />
        </span>
      }
      description={`${api.category} · 免密钥公开接口`}
      width="w-[min(460px,94vw)]"
      footer={
        <div className="flex flex-wrap items-center gap-3">
          <Switch
            checked={isOnline}
            onChange={(v) => void handleToggle(v)}
            disabled={pending}
            label={isOnline ? '接口在线，前台正常调用' : '维护中，调用返回 503'}
          />
          <span className="ml-auto inline-flex gap-2">
            <Button variant="outline" size="sm" onClick={handleViewLogs}>
              查看调用日志
            </Button>
            <Button
              variant="primary"
              size="sm"
              trailing="↗"
              onClick={() => window.open(docApiHref(api.path.split('/').pop() ?? ''), '_blank')}
            >
              接口文档
            </Button>
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="flex flex-col gap-1 rounded-lg border border-line bg-bg-soft/40 p-3">
            <span className="text-[10.5px] uppercase tracking-wider text-muted">调用 24h</span>
            <span className="font-mono text-[18px] font-semibold text-ink">
              {formatNumber(api.calls24h)}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-line bg-bg-soft/40 p-3">
            <span className="text-[10.5px] uppercase tracking-wider text-muted">P95 延迟</span>
            <span className="font-mono text-[18px] font-semibold text-ink">{api.avgLatencyMs}ms</span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-line bg-bg-soft/40 p-3">
            <span className="text-[10.5px] uppercase tracking-wider text-muted">错误率</span>
            <span className="font-mono text-[18px] font-semibold text-ink">
              {formatPercent(api.errorRate, 2)}
            </span>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-line bg-bg-soft/40 p-3">
            <span className="text-[10.5px] uppercase tracking-wider text-muted">可用性</span>
            <span className="font-mono text-[18px] font-semibold text-ink">
              {formatPercent(99.9 - api.errorRate / 10, 2)}
            </span>
          </div>
        </div>

        <p className="text-[12.5px] leading-relaxed text-muted">{findDesc(api.path)}</p>

        <CodeWindow
          code={buildApiCode(api)}
          lang="bash"
          title="terminal — decamore cli"
          lineNumbers
        />
      </div>
    </Drawer>
  );
}

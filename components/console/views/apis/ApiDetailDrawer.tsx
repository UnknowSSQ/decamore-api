'use client';
import { useState } from 'react';

import { Button, CodeWindow, Drawer, MethodBadge, Switch } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { updateManagedApi } from '@/lib/api';
import { docApiHref } from '@/constants/app';
import { apiUrl } from '@/components/docs/url';
import type { ManagedApi } from '@/types';
import { formatNumber, formatPercent } from '@/utils/format';

export interface ApiDetailDrawerProps {
  api: ManagedApi | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

/** 指标卡的统一形状，四张一起排 */
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-line bg-bg-soft/40 p-3">
      <span className="text-[10.5px] uppercase tracking-wider text-muted">{label}</span>
      <span className="font-mono text-[18px] font-semibold text-ink">{value}</span>
    </div>
  );
}

/** curl 与响应体都是前端拼的示例骨架，不是后端返回的真实结构 */
function buildApiCode(api: ManagedApi): string {
  const lines: string[] = [];
  lines.push(`curl -X ${api.method} "${apiUrl(api.path)}"`);
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
      await updateManagedApi(api.id, { status: next ? 'online' : 'degraded' });
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
    window.location.href = `/admin/logs?keyword=${encodeURIComponent(api.path)}`;
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
              onClick={() => window.open(docApiHref(api.id), '_blank')}
            >
              接口文档
            </Button>
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <Metric label="调用 24h" value={formatNumber(api.calls24h)} />
          <Metric label="平均耗时" value={`${api.avgLatencyMs}ms`} />
          <Metric label="错误率" value={formatPercent(api.errorRate, 2)} />
          {/* 数字来自本进程的调用环形缓冲（24h 窗口、上限 constants/app.ts 的 CALL_RING_CAPACITY），没有记录就是 0，不是估算 */}
          <Metric label="采样范围" value="本进程 24h" />
        </div>

        <p className="text-[12.5px] leading-relaxed text-muted">{api.description || '—'}</p>

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

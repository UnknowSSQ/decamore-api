import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';
import type { BadgeTone } from '@/types';

const TONE_CLASS: Record<BadgeTone, string> = {
  ok: 'bg-ok/10 text-ok border-ok/20',
  warn: 'bg-warn-soft text-warn border-warn/25',
  danger: 'bg-danger-soft text-danger border-danger/25',
  neutral: 'bg-bg-soft text-muted border-line',
  brand: 'bg-primary/10 text-primary border-primary/20',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
  dot,
  mono,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
  mono?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11px] font-semibold leading-none',
        TONE_CLASS[tone],
        mono && 'font-mono tracking-tight',
        className,
      )}
    >
      {dot && <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full bg-current')} />}
      {children}
    </span>
  );
}

/** 方法配色三处共用，别在调用方另写一套 */
const METHOD_TONE_CLASS: Record<string, string> = {
  GET: 'bg-ok/10 text-ok border-ok/25',
  POST: 'bg-primary/10 text-primary border-primary/25',
  PUT: 'bg-warn-soft text-warn border-warn/25',
  PATCH: 'bg-warn-soft text-warn border-warn/25',
  DELETE: 'bg-danger-soft text-danger border-danger/25',
};

export function MethodBadge({ method, className }: { method: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-[3px] font-mono text-[10.5px] font-bold uppercase tracking-[0.08em]',
        METHOD_TONE_CLASS[method] ?? METHOD_TONE_CLASS.GET,
        className,
      )}
    >
      {method}
    </span>
  );
}

/** 状态到配色/文案的唯一出处，调用方只传字符串 */
export function StatusPill({ status, className }: { status: 'online' | 'degraded' | 'offline' | 'enabled' | 'disabled'; className?: string }) {
  const map = {
    online: { tone: 'ok' as BadgeTone, label: '在线' },
    degraded: { tone: 'warn' as BadgeTone, label: '降级' },
    offline: { tone: 'danger' as BadgeTone, label: '停用' },
    enabled: { tone: 'ok' as BadgeTone, label: '启用' },
    disabled: { tone: 'neutral' as BadgeTone, label: '停用' },
  };
  const item = map[status];
  return (
    <Badge tone={item.tone} dot className={className}>
      {item.label}
    </Badge>
  );
}

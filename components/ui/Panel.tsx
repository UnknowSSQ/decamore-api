import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

export function Panel({
  children,
  className,
  as: Tag = 'div',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'aside' | 'li';
  padded?: boolean;
}) {
  return (
    <Tag className={cn('panel', padded && 'p-dsp-4', className)}>{children}</Tag>
  );
}

export function Kicker({ children, line = true, className }: { children: ReactNode; line?: boolean; className?: string }) {
  return <p className={cn('kicker', line && 'kicker--line', className)}>{children}</p>;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-dsp-3', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-[19px] font-semibold leading-tight tracking-[-0.01em] text-ink">{title}</h1>
        {description && <p className="text-[12.5px] leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function PanelTitle({
  title,
  extra,
  description,
  className,
}: {
  title: ReactNode;
  extra?: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[13.5px] font-semibold leading-snug text-ink">{title}</h3>
        {description && <p className="text-[11.5px] leading-relaxed text-muted">{description}</p>}
      </div>
      {extra}
    </div>
  );
}

export function EmptyState({
  mark = '⌕',
  title,
  description,
  action,
  className,
}: {
  mark?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-surface/60 px-6 text-center',
        className,
      )}
    >
      <span aria-hidden className="font-serif text-[34px] leading-none text-muted/70">
        {mark}
      </span>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {description && <p className="max-w-[46ch] text-[12.5px] leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span className={cn('block animate-pulse rounded-md bg-bg-soft', className)} />;
}

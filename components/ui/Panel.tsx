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

export function LiftCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-line bg-surface p-dsp-4 shadow-card transition-all duration-300 ease-dec hover:-translate-y-1.5 hover:border-primary/35 hover:shadow-lift',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Kicker({ children, line = true, className }: { children: ReactNode; line?: boolean; className?: string }) {
  return <p className={cn('kicker', line && 'kicker--line', className)}>{children}</p>;
}

export function SectionHeading({
  kicker,
  title,
  accent,
  description,
  align = 'left',
  action,
  className,
  id,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  accent?: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  action?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-dsp-2',
        align === 'center' && 'items-center text-center',
        action && align === 'left' && 'sm:flex-row sm:items-end sm:justify-between sm:gap-dsp-4',
        className,
      )}
    >
      <div className={cn('flex flex-col gap-dsp-2', action && 'flex-1')}>
        {kicker && <Kicker>{kicker}</Kicker>}
        <h2 id={id} className="max-w-[22ch] text-balance text-[clamp(1.6rem,3.4vw,2.35rem)] font-semibold leading-[1.18] tracking-[-0.01em] text-ink">
          {title}
          {accent && <span className="block text-primary">{accent}</span>}
        </h2>
        {description && (
          <p className={cn('max-w-[62ch] text-[15px] leading-[1.8] text-muted', align === 'center' && 'mx-auto')}>{description}</p>
        )}
      </div>
      {action && <div className={cn('shrink-0', align === 'center' ? 'mt-dsp-2 self-center' : 'self-end')}>{action}</div>}
    </div>
  );
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

export function Spinner({ className, label = '加载中' }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-[12px] text-muted', className)}>
      <span
        aria-hidden
        className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
      />
      {label}
    </span>
  );
}

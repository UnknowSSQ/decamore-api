import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

const TONE_CLASS: Record<'info' | 'warn' | 'danger', string> = {
  info: 'border-l-primary bg-sage text-[#3d4a40] [&_strong]:text-primary-dark',
  warn: 'border-l-[#c2703f] bg-danger-soft text-[#6a4a35] [&_strong]:text-[#a1552b]',
  danger: 'border-l-danger bg-danger-soft text-[#6d3a24] [&_strong]:text-danger',
};

export function Callout({
  children,
  tone = 'info',
  mark,
  size = 'md',
  className,
}: {
  children: ReactNode;
  tone?: 'info' | 'warn' | 'danger';
  mark?: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-r-[14px] border-l-2',
        size === 'md' ? 'p-4 text-[12.5px] leading-[1.85]' : 'p-3 text-[11.5px] leading-[1.8]',
        TONE_CLASS[tone],
        className,
      )}
    >
      {mark && (
        <span aria-hidden className="shrink-0 font-serif text-[13px] font-semibold italic leading-[1.6]">
          {mark}
        </span>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Code({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <code
      className={cn(
        'rounded-[6px] border border-line bg-bg-soft px-1.5 py-[1px] font-mono text-[0.86em] text-[#2f4a3a]',
        className,
      )}
    >
      {children}
    </code>
  );
}

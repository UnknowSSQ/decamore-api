'use client';
import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

/** 没有面板语义，只表达当前值：用于筛选而不是切内容 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  options: readonly { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn('inline-flex items-center gap-1 rounded-full border border-line bg-bg-soft p-1', className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition-all duration-200',
              selected ? 'bg-surface text-primary shadow-card' : 'text-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

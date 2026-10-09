'use client';
/** id 由 value + idPrefix 派生而不是 useId，保证 SSR 与 CSR 算出同一份 id */
import { useRef, type ReactNode } from 'react';

import { cn } from '@/utils/cn';

export interface TabItem {
  value: string;
  label: ReactNode;
  badge?: number | string;
  disabled?: boolean;
}

interface TabsProps {
  items: readonly TabItem[];
  value: string;
  onChange: (value: string) => void;
  variant?: 'console' | 'terminal';
  /** aria-controls / id 的前缀，同页多组 tablist 靠它隔离 */
  idPrefix: string;
  className?: string;
  panelKeyOf?: (value: string) => string;
  fill?: boolean;
}

function badgeClass(variant: 'console' | 'terminal'): string {
  return variant === 'console'
    ? 'ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary'
    : 'ml-1.5 font-mono text-[10px] opacity-60';
}

export function Tabs({ items, value, onChange, variant = 'console', idPrefix, className, panelKeyOf, fill = false }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const move = (delta: number): void => {
    const enabled = items.filter((item) => !item.disabled);
    if (enabled.length === 0) return;
    const current = enabled.findIndex((item) => item.value === value);
    const next = enabled[(current + delta + enabled.length) % enabled.length];
    if (!next) return;
    onChange(next.value);
    // 自动激活模式：焦点必须跟着选中项走，否则方向键连着按会丢焦点
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    const target = items.findIndex((item) => item.value === next.value);
    buttons?.[target]?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-orientation="horizontal"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          move(1);
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          move(-1);
        }
      }}
      className={cn(
        'flex items-center gap-1',
        variant === 'console' && 'border-b border-line',
        variant === 'terminal' && 'gap-3 border-b border-line',
        fill && '[&>*]:flex-1',
        className,
      )}
    >
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${item.value}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${panelKeyOf?.(item.value) ?? item.value}`}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative inline-flex items-center whitespace-nowrap transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50',
              variant === 'console' &&
                cn(
                  '-mb-px border-b-2 px-3.5 py-2.5 text-[12.5px] font-semibold',
                  selected ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink',
                ),
              variant === 'terminal' &&
                cn(
                  'rounded-md border-0 px-3 py-1.5 font-sans text-[11.5px]',
                  selected ? 'bg-white/10 text-wash-2' : 'bg-transparent text-[#8d9c92] hover:text-hair',
                ),
            )}
          >
            {item.label}
            {item.badge !== undefined && <span className={badgeClass(variant)}>{item.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

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

export function TabPanel({
  idPrefix,
  value,
  active,
  panelKeyOf,
  children,
  className,
}: {
  idPrefix: string;
  value: string;
  active: string;
  panelKeyOf?: (value: string) => string;
  children: ReactNode;
  className?: string;
}) {
  const key = panelKeyOf?.(value) ?? value;
  if (value !== active) return null;
  return (
    <div role="tabpanel" id={`${idPrefix}-panel-${key}`} aria-labelledby={`${idPrefix}-tab-${value}`} tabIndex={0} className={className}>
      {children}
    </div>
  );
}

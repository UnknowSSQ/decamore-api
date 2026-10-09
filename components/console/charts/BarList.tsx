'use client';
/** 以最大值归一化的横向条列表，长度表示相对占比而非绝对量 */

export interface BarListItem {
  label: string;
  value: number;
  variant?: 'normal' | 'warn' | 'danger';
}

export interface BarListProps {
  items: BarListItem[];
  formatValue?: (value: number) => string;
}

export function BarList({ items, formatValue }: BarListProps) {
  // 兜底 1，全零数据时除不出百分比
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const format = formatValue ?? ((v: number) => v.toLocaleString('en-US'));

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => {
        const percent = (item.value / maxValue) * 100;
        const variant = item.variant ?? 'normal';
        const barColor =
          variant === 'danger'
            ? 'bg-danger'
            : variant === 'warn'
              ? 'bg-warn'
              : 'bg-gradient-to-r from-[#6c8d72] to-primary';

        return (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium text-ink">{item.label}</span>
              <span className="font-mono text-muted">{format(item.value)}</span>
            </div>
            <div className="h-[6px] w-full overflow-hidden rounded-full bg-bg-soft">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

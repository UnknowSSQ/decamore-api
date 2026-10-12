'use client';
/** 以最大值归一化的横向条列表，长度表示相对占比而非绝对量 */
import { formatNumber } from '@/utils/format';

interface BarListItem {
  label: string;
  value: number;
}

export function BarList({ items }: { items: BarListItem[] }) {
  // 兜底 1，全零数据时除不出百分比
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const format = formatNumber;

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => {
        const percent = (item.value / maxValue) * 100;

        return (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium text-ink">{item.label}</span>
              <span className="font-mono text-muted">{format(item.value)}</span>
            </div>
            <div className="h-[6px] w-full overflow-hidden rounded-full bg-bg-soft">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6c8d72] to-primary transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

'use client';
/** 2xx/4xx/5xx/429 四档；429 先判，因此不再重复计入 4xx。
 *  数的是传进来的那一页，不是整个筛选区间——标题里写清楚，别和上方按筛选算的汇总卡混读 */
import { STATUS_FAMILY_COLORS } from '@/constants/app';
import type { CallLog } from '@/types';

export function StatusBars({ logs }: { logs: CallLog[] }) {
  const counts = logs.reduce(
    (acc, log) => {
      if (log.status === 429) acc.r429++;
      else if (log.status >= 200 && log.status < 300) acc.r2xx++;
      else if (log.status >= 400 && log.status < 500) acc.r4xx++;
      else if (log.status >= 500) acc.r5xx++;
      return acc;
    },
    { r2xx: 0, r4xx: 0, r5xx: 0, r429: 0 },
  );

  const total = counts.r2xx + counts.r4xx + counts.r5xx + counts.r429;
  // 一条日志都没有时不画空框
  if (total === 0) return null;

  const maxCount = Math.max(counts.r2xx, counts.r4xx, counts.r5xx, counts.r429, 1);

  const bars = [
    { label: '2xx', count: counts.r2xx, color: STATUS_FAMILY_COLORS['2xx'] },
    { label: '4xx', count: counts.r4xx, color: STATUS_FAMILY_COLORS['4xx'] },
    { label: '5xx', count: counts.r5xx, color: STATUS_FAMILY_COLORS['5xx'] },
    { label: '429', count: counts.r429, color: STATUS_FAMILY_COLORS['429'] },
  ];

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="mb-3 text-[12px] font-semibold text-ink">本页状态码分布</div>
      <div className="flex items-end gap-3" style={{ height: 80 }}>
        {bars.map((bar) => {
          const height = (bar.count / maxCount) * 100;
          return (
            <div key={bar.label} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="relative w-full" style={{ height: 60 }}>
                <div
                  className="absolute bottom-0 w-full rounded-t-md transition-all"
                  style={{
                    height: `${height}%`,
                    backgroundColor: bar.color,
                    minHeight: bar.count > 0 ? 4 : 0,
                  }}
                />
              </div>
              <div className="text-[10.5px] font-medium text-muted">{bar.label}</div>
              <div className="text-[11px] font-semibold text-ink">{bar.count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

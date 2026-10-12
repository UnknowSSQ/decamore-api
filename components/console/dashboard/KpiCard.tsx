'use client';
import { Panel } from '@/components/ui/Panel';
import { Sparkline } from '@/components/console/charts/Sparkline';
import { useCountUp } from '@/hooks/useUi';
import { formatNumber, formatPercent } from '@/utils/format';
import { cn } from '@/utils/cn';

export interface KpiCardProps {
  label: string;
  value: number;
  /** 与前一等长区间的差；没有可比口径就不传，卡片不编一个箭头出来 */
  delta?: number;
  deltaLabel?: string;
  footnote: string;
  /** 迷你折线的真实序列，缺省则不画 */
  series?: number[];
  /** 越低越好的指标（错误率、延迟）传 true，箭头颜色才不反着来 */
  lowerIsBetter?: boolean;
  format?: 'number' | 'percent' | 'ms';
}

const COLORS = { ink: 'text-ink', ok: 'text-ok', danger: 'text-danger', muted: 'text-muted' } as const;

export function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  footnote,
  series,
  lowerIsBetter = false,
  format = 'number',
}: KpiCardProps) {
  const animatedValue = useCountUp(value, 950);

  const formatValue = (v: number): string => {
    if (format === 'percent') return formatPercent(v, 2);
    if (format === 'ms') return `${Math.round(v)}ms`;
    return formatNumber(v);
  };

  // 0 视为持平：既不是 ▲ 也不该标红
  const direction = delta === undefined || delta === 0 ? 'flat' : delta > 0 ? 'up' : 'down';
  const improved = direction === 'flat' ? undefined : (direction === 'up') !== lowerIsBetter;

  const tone = improved === undefined ? COLORS.muted : improved ? COLORS.ok : COLORS.danger;

  return (
    <Panel className="relative overflow-hidden">
      <div className="flex flex-col gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
        <p className="font-mono text-[clamp(24px,2.4vw,30px)] font-bold text-ink">{formatValue(animatedValue)}</p>
        {delta !== undefined && (
          <div className="flex items-center gap-2 text-[11.5px]">
            <span className={cn('font-semibold', tone)}>
              {direction === 'flat' ? '—' : direction === 'up' ? '▲' : '▼'} {Math.abs(delta).toFixed(2)}
              {format === 'percent' ? 'pt' : '%'}
            </span>
            {deltaLabel && <span className="text-muted">{deltaLabel}</span>}
          </div>
        )}
        <p className="text-[10.5px] text-muted">{footnote}</p>
      </div>
      {series && series.length > 1 && (
        <div className="absolute bottom-3 right-3">
          <Sparkline values={series} />
        </div>
      )}
    </Panel>
  );
}

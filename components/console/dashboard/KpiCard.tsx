'use client';
import { Panel } from '@/components/ui/Panel';
import { Sparkline } from '@/components/console/charts/Sparkline';
import { useCountUp } from '@/hooks/useUi';
import { formatNumber, formatPercent } from '@/utils/format';
import { cn } from '@/utils/cn';

export interface KpiCardProps {
  label: string;
  value: number;
  delta: number;
  deltaLabel: string;
  footnote: string;
  sparkColor: string;
  sparkSeed: number;
  format?: 'number' | 'percent' | 'ms';
}

export function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  footnote,
  sparkColor,
  sparkSeed,
  format = 'number',
}: KpiCardProps) {
  const animatedValue = useCountUp(value, 950);

  const formatValue = (v: number): string => {
    if (format === 'percent') return formatPercent(v, 2);
    if (format === 'ms') return `${Math.round(v)}ms`;
    return formatNumber(v);
  };

  // 方向由 label 文案决定：错误率/延迟下降才算好转
  const isGoodDown = label.includes('错误率') || label.includes('延迟');
  const deltaIsGood = (delta < 0 && isGoodDown) || (delta > 0 && !isGoodDown);

  return (
    <Panel className="relative overflow-hidden">
      <div className="flex flex-col gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
        <p className="font-mono text-[clamp(24px,2.4vw,30px)] font-bold text-ink">
          {formatValue(animatedValue)}
        </p>
        <div className="flex items-center gap-2 text-[11.5px]">
          <span
            className={cn(
              'font-semibold',
              deltaIsGood ? 'text-ok' : 'text-danger',
            )}
          >
            {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(2)}
            {format === 'percent' ? 'pt' : '%'}
          </span>
          <span className="text-muted">{deltaLabel}</span>
        </div>
        <p className="text-[10.5px] text-muted">{footnote}</p>
      </div>
      <div className="absolute bottom-3 right-3">
        <Sparkline color={sparkColor} seed={sparkSeed} />
      </div>
    </Panel>
  );
}

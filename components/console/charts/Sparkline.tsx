'use client';
/** KPI 卡的迷你折线：序列由服务端聚合结果给出，缺省或全零时不画 */
import type { ReactNode } from 'react';

const WIDTH = 86;
const HEIGHT = 30;
/** 与主色同值：KPI 卡的迷你折线只有这一种颜色，没有调用点需要换 */
const STROKE = '#365b49';

export interface SparklineProps {
  values: number[];
}

export function Sparkline({ values }: SparklineProps) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = values.map((v, i) => {
    const x = (i / (values.length - 1)) * WIDTH;
    const y = HEIGHT - ((v - min) / range) * HEIGHT;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const last = coords[coords.length - 1]?.split(',') ?? [];
  const dot: ReactNode =
    last[0] !== undefined && last[1] !== undefined ? (
      <circle cx={last[0]} cy={last[1]} r={2} fill={STROKE} />
    ) : null;

  return (
    <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="overflow-visible" aria-hidden>
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={STROKE}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {dot}
    </svg>
  );
}

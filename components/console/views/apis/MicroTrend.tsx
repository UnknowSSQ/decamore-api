'use client';
/** 表格行内的装饰折线：无交互、尺寸固定，与 charts/ 下带 tooltip 的通用图不是一类 */

export interface MicroTrendProps {
  data: readonly number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

export function MicroTrend({
  data,
  color = '#365b49',
  width = 68,
  height = 21,
  className,
}: MicroTrendProps) {
  // 两点连不成线，宁可不画
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * w;
      const y = pad + h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const lastX = pad + w;
  const lastY = pad + h - ((data[data.length - 1]! - min) / range) * h;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.8}
      />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
    </svg>
  );
}

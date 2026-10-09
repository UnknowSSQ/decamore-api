'use client';
/** 迷你折线只是 KPI 卡的装饰趋势，数据由固定种子伪随机生成，SSR/CSR 才能同形 */
import { useMemo } from 'react';

export interface SparklineProps {
  points?: number;
  seed?: number;
  color?: string;
  width?: number;
  height?: number;
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Sparkline({
  points = 14,
  seed = 42,
  color = '#365b49',
  width = 86,
  height = 30,
}: SparklineProps) {
  const data = useMemo(() => {
    const rand = mulberry32(seed);
    return Array.from({ length: points }, () => rand());
  }, [points, seed]);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const coords = data.map((v, i) => {
    const x = (i / (points - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  const polyline = coords.join(' ');
  const lastPoint = coords[points - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline points={polyline} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {lastPoint && <circle cx={lastPoint.split(',')[0]} cy={lastPoint.split(',')[1]} r={2} fill={color} />}
    </svg>
  );
}

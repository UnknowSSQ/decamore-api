'use client';
/** 单圈 SVG 用 stroke-dasharray 拼弧段，不生成 path */
import { useMemo } from 'react';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  segments: DonutSegment[];
}

/** 唯一调用点只传 segments，几何值收成本组件的常量 */
const SIZE = 168;
const RADIUS = 66;
const STROKE_WIDTH = 15;

export function DonutChart({ segments }: DonutChartProps) {
  const center = SIZE / 2;
  const circumference = 2 * Math.PI * RADIUS;

  const total = useMemo(() => segments.reduce((s, seg) => s + seg.value, 0), [segments]);

  const arcs = useMemo(() => {
    let offset = 0;
    return segments.map((seg) => {
      const ratio = total > 0 ? seg.value / total : 0;
      const arcLen = ratio * circumference;
      const dashArray = `${arcLen} ${circumference - arcLen}`;
      const dashOffset = -offset;
      offset += arcLen;
      return { ...seg, ratio, dashArray, dashOffset };
    });
  }, [segments, total, circumference]);

  /** 约定第一段就是要显示在圆心的那类（调用方按 2xx 排首位） */
  const successRatio = arcs[0]?.ratio ?? 0;
  const displayLabel = `${(successRatio * 100).toFixed(1)}%`;

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <g transform={`rotate(-90 ${center} ${center})`}>
            {arcs.map((arc, i) => (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={arc.dashArray}
                strokeDashoffset={arc.dashOffset}
                strokeLinecap="butt"
              />
            ))}
          </g>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[22px] font-bold text-ink">{displayLabel}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        {segments.map((seg, i) => {
          const ratio = total > 0 ? seg.value / total : 0;
          return (
            <div key={i} className="flex items-center gap-2 text-[11.5px]">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-muted">{seg.label}</span>
              <span className="ml-auto font-mono text-ink">{seg.value.toLocaleString('en-US')}</span>
              <span className="font-mono text-muted">{(ratio * 100).toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';
/** SVG 面积图：宽度靠容器实测，hover 吸附最近的数据点 */
import { useCallback, useMemo, useRef, useState } from 'react';

export interface AreaChartPoint {
  label: string;
  value: number;
}

export interface AreaChartProps {
  data: AreaChartPoint[];
  height?: number;
  color?: string;
}

const PADDING = { top: 16, right: 12, bottom: 28, left: 48 };

export function AreaChart({ data, height = 258, color = '#365b49' }: AreaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null);
  const [width, setWidth] = useState(600);

  const measureRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    containerRef.current = node;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    ro.observe(node);
    // 首次回调是异步的，先同步量一次，否则首帧按默认宽度画
    setWidth(node.clientWidth);
    return () => ro.disconnect();
  }, []);

  const { min, max, points, path, areaPath } = useMemo(() => {
    if (data.length === 0) {
      return { min: 0, max: 0, points: [], path: '', areaPath: '' };
    }
    const values = data.map((d) => d.value);
    const minVal = Math.min(...values) * 0.9;
    const maxVal = Math.max(...values) * 1.05;
    const range = maxVal - minVal || 1;

    const chartW = width - PADDING.left - PADDING.right;
    const chartH = height - PADDING.top - PADDING.bottom;

    const pts = data.map((d, i) => ({
      x: PADDING.left + (i / Math.max(1, data.length - 1)) * chartW,
      y: PADDING.top + (1 - (d.value - minVal) / range) * chartH,
      label: d.label,
      value: d.value,
    }));

    // 控制点取两端 x 的中点，得到观感平滑的三次 Bezier
    let linePath = `M ${pts[0]?.x},${pts[0]?.y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      if (!prev || !curr) continue;
      const cpx = (prev.x + curr.x) / 2;
      linePath += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
    }

    const last = pts[pts.length - 1];
    const first = pts[0];
    if (!last || !first) return { min: minVal, max: maxVal, points: pts, path: linePath, areaPath: '' };
    const area = `${linePath} L ${last.x},${PADDING.top + chartH} L ${first.x},${PADDING.top + chartH} Z`;

    return { min: minVal, max: maxVal, points: pts, path: linePath, areaPath: area };
  }, [data, width, height]);

  const chartH = height - PADDING.top - PADDING.bottom;

  /** noUncheckedIndexedAccess 下 points[i] 是 T | undefined，先取一次收窄再给 JSX 用 */
  const hoverPoint = hover ? points[hover.index] : undefined;

  const gridLines = useMemo(() => {
    const lines: { y: number; label: string }[] = [];
    for (let i = 0; i <= 4; i++) {
      const y = PADDING.top + (i / 4) * chartH;
      const val = max - (i / 4) * (max - min);
      lines.push({ y, label: val >= 10000 ? `${(val / 10000).toFixed(1)}万` : Math.round(val).toString() });
    }
    return lines;
  }, [min, max, chartH]);

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (points.length === 0) return;
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;

    let closest = 0;
    let closestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (!pt) continue;
      const dist = Math.abs(pt.x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }
    const pt = points[closest];
    if (pt) setHover({ index: closest, x: pt.x, y: pt.y });
  };

  const handleMouseLeave = () => setHover(null);

  // 点数密集时抽稀标签，否则会互相压叠
  const xLabelInterval = data.length > 40 ? 8 : data.length > 20 ? 8 : 5;

  return (
    <div ref={measureRef} className="relative w-full">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="cursor-crosshair"
      >
        <defs>
          <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.26} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {gridLines.map((line, i) => (
          <g key={i}>
            <line
              x1={PADDING.left}
              y1={line.y}
              x2={width - PADDING.right}
              y2={line.y}
              stroke="#e7e6df"
              strokeDasharray="3 5"
              strokeWidth={0.8}
            />
            <text x={PADDING.left - 6} y={line.y + 3} textAnchor="end" fontSize={9} fill="#737a73" fontFamily="ui-monospace, monospace">
              {line.label}
            </text>
          </g>
        ))}

        {areaPath && <path d={areaPath} fill="url(#area-gradient)" />}

        {path && <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}

        {points.map((pt, i) =>
          i % xLabelInterval === 0 ? (
            <text key={i} x={pt.x} y={height - 6} textAnchor="middle" fontSize={9} fill="#737a73">
              {pt.label}
            </text>
          ) : null,
        )}

        {hover && (
          <>
            <line
              x1={hover.x}
              y1={PADDING.top}
              x2={hover.x}
              y2={PADDING.top + chartH}
              stroke={color}
              strokeDasharray="3 3"
              strokeWidth={1}
              opacity={0.5}
            />
            <circle cx={hover.x} cy={hover.y} r={4} fill={color} stroke="#fffefa" strokeWidth={2} />
          </>
        )}
      </svg>

      {hover && hoverPoint && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-ink px-3 py-1.5 text-[11px] text-surface shadow-pop"
          style={{
            left: hover.x,
            top: hover.y - 36,
            transform: 'translateX(-50%)',
          }}
        >
          <span className="font-semibold">{hoverPoint.label}</span>
          <span className="ml-2 font-mono">{hoverPoint.value.toLocaleString('en-US')}</span>
        </div>
      )}
    </div>
  );
}

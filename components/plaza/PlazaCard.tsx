'use client';
import type { CSSProperties } from 'react';
import { Reveal } from '@/components/shared/Reveal';
import { cn } from '@/utils/cn';
import type { ApiCatalogItem, CardSpan, DemoKind } from '@/types';
import { getDemoComponent } from './demos';
import { matchRanges } from '@/utils/search';

/** 画面本身就是返回值：卡片文字全收起，位置让给图片 */
const MEDIA_DEMOS: readonly DemoKind[] = ['wallpaper', 'emoji', 'avatar', 'image'];

interface PlazaCardProps {
  item: ApiCatalogItem;
  seed: number;
  onRefresh: () => void;
  index: number;
  keyword: string;
  /** 12 列网格里占几列 × 几行，后台配置 */
  span: CardSpan;
  /** 深链命中时播一次闪烁动画 */
  flashing?: boolean;
}

export function PlazaCard({ item, seed, onRefresh, index, keyword, span, flashing = false }: PlazaCardProps) {
  const DemoComponent = getDemoComponent(item.demo);
  const mediaDemo = item.demo !== null && MEDIA_DEMOS.includes(item.demo);

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, button, a, label, select')) return;
    onRefresh();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRefresh();
    }
  };

  const nameRanges = matchRanges(item.name, keyword);

  return (
    <Reveal
      as="article"
      id={item.id}
      className={cn(
        // 跨度变量只能挂在这个 grid item 上，写进内层容器不生效；md 以下走堆叠布局
        'card-span group relative flex flex-col overflow-hidden rounded-lg border border-primary/10 bg-surface p-6 shadow-card transition-all duration-300 ease-dec hover:-translate-y-1.5 hover:border-primary/35 hover:shadow-lift focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-offset-2 min-h-[338px] max-[980px]:min-h-[320px] max-[760px]:min-h-[300px]',
        mediaDemo && 'p-3.5',
        // 动画在 globals.css 的 .plaza-card--flash，1.8s 后由父级摘掉
        flashing && 'plaza-card--flash',
      )}
      style={{ ['--card-cols']: span.cols, ['--card-rows']: span.rows } as CSSProperties}
      delay={Math.min(index, 7) * 0.05}
      threshold={0.12}
    >
      <div
        tabIndex={0}
        role="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="flex h-full flex-col outline-none"
        aria-label={`${item.name} - ${item.desc}。按 Enter 刷新演示。`}
      >
        <div className="flex items-center justify-between gap-2.5">
          <h3 className="text-[13px] font-semibold tracking-tight text-ink">
            {highlightText(item.name, nameRanges)} · {item.en}
          </h3>
          <span className="shrink-0 font-mono text-[10px] text-muted">{item.path}</span>
        </div>

        {!mediaDemo && (
          <>
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">{item.desc}</p>

            <p className="mt-2 font-mono text-[9.5px] tracking-wide text-muted/60">
              {item.kw.split(' ').slice(0, 3).join(' · ')}
            </p>
          </>
        )}

        <div
          className={cn(
            'flex flex-1 items-center justify-center py-4',
            mediaDemo && 'mt-2.5 min-h-0 flex-col items-stretch justify-start p-0',
          )}
        >
          <DemoComponent seed={seed} />
        </div>

        {!mediaDemo && (
          <div className="flex items-center justify-between text-[10px] text-muted">
            <span className="rounded-full border border-line bg-white/70 px-2 py-1 tracking-wide">
              {item.method}
            </span>
            <span className="opacity-0 -translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
              {item.hint}
            </span>
          </div>
        )}

        {mediaDemo && (
          // 图片占了整张卡片，换图提示改成悬停时浮在图上，不再占一行高度
          <span className="pointer-events-none absolute right-5 bottom-5 rounded-full border border-line bg-white/80 px-2 py-1 text-[10px] text-muted opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {item.hint}
          </span>
        )}
      </div>
    </Reveal>
  );
}

function highlightText(text: string, ranges: [number, number][]): React.ReactNode {
  if (ranges.length === 0) return text;
  
  const parts: React.ReactNode[] = [];
  let lastEnd = 0;
  
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  
  for (const [start, end] of sorted) {
    if (start > lastEnd) {
      parts.push(text.slice(lastEnd, start));
    }
    if (start >= lastEnd) {
      parts.push(
        <mark key={start} className="rounded-sm bg-accent/50 px-0.5 text-ink">
          {text.slice(start, end)}
        </mark>
      );
      lastEnd = end;
    }
  }
  
  if (lastEnd < text.length) {
    parts.push(text.slice(lastEnd));
  }
  
  return <>{parts}</>;
}

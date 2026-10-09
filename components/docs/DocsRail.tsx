'use client';
/**
 * 文档页目录，两个断点两套导出：DocsRail（>900px 左栏）与 DocsTocStrip（≤900px 吸顶条）。
 * 高亮判定共用 TocLinks，避免两种排版的选中态走偏。
 */
import { useMemo } from 'react';
import Link from 'next/link';

import { cn } from '@/utils/cn';
import { useScrolled, useScrollSpy } from '@/hooks/useUi';
import { ROUTES } from '@/constants/app';
import type { SiblingApi, TocItem } from './types';

interface DocsRailProps {
  tocItems: TocItem[];
  siblingApis: SiblingApi[];
}

function TocLinks({
  items,
  layout,
  activeId,
}: {
  items: TocItem[];
  layout: 'column' | 'pills';
  activeId: string;
}) {
  return (
    <>
      {items.map((item) => {
        const isActive = activeId === item.id;
        const tone = isActive
          ? 'border-primary bg-[rgba(54,91,73,0.07)] font-semibold text-primary'
          : 'border-line text-ink-2 hover:text-primary';
        return (
          <Link
            key={item.id}
            href={`#${item.id}`}
            aria-current={isActive ? 'true' : undefined}
            className={cn(
              'transition-colors',
              layout === 'column'
                ? cn('block border-l-2 py-[7px] pl-3 pr-2 text-[13px] leading-[1.5]', tone)
                : cn('shrink-0 whitespace-nowrap rounded-full border px-[15px] py-[9px] text-[12.5px]', tone),
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

/** 左栏目录 + 同组接口 */
export function DocsRail({ tocItems, siblingApis }: DocsRailProps) {
  const ids = useMemo(() => tocItems.map((item) => item.id), [tocItems]);
  const activeId = useScrollSpy(ids);

  return (
    <aside
      className={cn(
        'docs-rail sticky top-[var(--docs-stick)] max-h-[calc(100vh-140px)] overflow-y-auto pb-3 [scrollbar-width:thin]',
        // ≤900px 目录交给吸顶条，这里只留「同组接口」并排到正文之后
        'max-[900px]:static max-[900px]:order-4 max-[900px]:max-h-none max-[900px]:mt-12 max-[900px]:border-t max-[900px]:border-line max-[900px]:pt-6',
      )}
      aria-label="文档目录"
    >
      {/* 同一份 anchor 不能出现两次，窄屏下 rail 的目录组必须隐藏 */}
      <div className="rail-group rail-group--toc max-[900px]:hidden">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-4">
          本文档
        </p>
        <nav className="rail-list flex flex-col gap-0">
          <TocLinks items={tocItems} layout="column" activeId={activeId} />
        </nav>
      </div>

      <div className="rail-group mt-6 max-[900px]:mt-0">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-4">
          同组接口
        </p>
        <nav className="flex flex-col gap-0">
          {siblingApis.map((api) => (
            <Link
              key={api.href}
              href={api.href}
              className="block border-l-2 border-line py-[7px] pl-3 pr-2 text-[13px] leading-[1.5] text-ink-2 transition-colors hover:text-primary"
            >
              {api.label}
              <small className="mt-[3px] block text-[11px] leading-tight text-ink-4">
                {api.path}
              </small>
            </Link>
          ))}
        </nav>
        <p className="mt-[14px] text-[11px] leading-[1.7] text-ink-4">
          文档以单接口为单位组织。
          <br />
          全部接口目录见{' '}
          <Link href={ROUTES.docs} className="text-primary underline-offset-2 hover:underline">
            文档首页
          </Link>
          ，或回到{' '}
          <Link href="/plaza" className="text-primary underline-offset-2 hover:underline">
            接口广场
          </Link>
          。
        </p>
      </div>
    </aside>
  );
}

/**
 * ≤900px 吸顶目录条。必须是正文容器的直接子元素、不能留在网格内：
 * sticky 只在自己的包含块里滑动，而单列网格下 rail 那一行的高度就是它自身高度，没有滑动余量。
 * z-30 压在导航（40）下面；只有滚过阈值才补背景，首屏保持透明。
 */
export function DocsTocStrip({ tocItems }: { tocItems: TocItem[] }) {
  const ids = useMemo(() => tocItems.map((item) => item.id), [tocItems]);
  const activeId = useScrollSpy(ids);
  const stuck = useScrolled(60);

  return (
    <div
      className={cn(
        'sticky top-[var(--docs-strip)] z-30 hidden max-[900px]:-mx-6 max-[900px]:block max-[900px]:px-6 max-[760px]:-mx-[18px] max-[760px]:px-[18px]',
        'border-b py-2 transition-colors duration-300 ease-dec',
        stuck
          ? 'border-line bg-bg/90 shadow-[0_10px_24px_rgba(37,50,41,0.06)] backdrop-blur-[14px]'
          : 'border-transparent',
      )}
      aria-label="文档目录（吸顶）"
    >
      <nav
        className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="本文档章节"
      >
        <TocLinks items={tocItems} layout="pills" activeId={activeId} />
      </nav>
    </div>
  );
}

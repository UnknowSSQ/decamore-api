'use client';
/** 隐藏态用 visibility 而不是卸载：常驻着滚到阈值才不会插入节点抖布局
 *  z-[45]：要盖过 sticky header（40），又不跟弹层 80 / toast 90 抢 */
import { useCallback } from 'react';

import { Icon } from '@/components/ui/Icon';
import { useScrollVisible } from '@/hooks/useUi';
import { cn } from '@/utils/cn';

interface BackToTopProps {
  threshold?: number;
  bottomGapPx?: number;
  className?: string;
}

export function BackToTop({ threshold = 400, bottomGapPx = 260, className }: BackToTopProps) {
  const visible = useScrollVisible(threshold, bottomGapPx);

  const toTop = useCallback(() => {
    // 平滑滚动对晕动症不友好，reduced-motion 下直接跳到顶
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }, []);

  return (
    <button
      type="button"
      onClick={toTop}
      // 隐藏时连 Tab 与读屏一起摘掉，否则是个「按了没反应」的幽灵按钮
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      aria-label="回到顶部"
      title="回到顶部"
      className={cn(
        'fixed right-5 bottom-[104px] z-[45] grid h-[44px] w-[44px] place-items-center',
        'rounded-full border border-line bg-surface/95 text-ink shadow-pop backdrop-blur',
        'transition-[opacity,transform,border-color,color] duration-300 ease-dec',
        'hover:-translate-y-0.5 hover:border-primary hover:text-primary',
        visible ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-3 opacity-0',
        className,
      )}
    >
      <Icon name="arrow-up" size={18} />
    </button>
  );
}

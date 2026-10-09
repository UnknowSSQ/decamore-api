'use client';
/** 水合之后才观察，首屏文本始终在 DOM 里（不影响 SEO）；reduced-motion 由 globals.css 兜底 */
import { createElement, type CSSProperties, type ElementType, type ReactNode } from 'react';

import { cn } from '@/utils/cn';
import { useReveal } from '@/hooks/useUi';

interface RevealProps {
  children: ReactNode;
  as?: ElementType;
  /** 单位是秒，不是毫秒 */
  delay?: number;
  className?: string;
  threshold?: number;
  id?: string;
  /** Reveal 自己就是 grid item 时，布局跨度那类 CSS 变量只能挂这里，写进内层卡片不生效 */
  style?: CSSProperties;
}

export function Reveal({ children, as = 'div', delay = 0, className, threshold, id, style }: RevealProps) {
  const { ref, visible } = useReveal<HTMLElement>({ threshold });

  // React 的类型没收录 --* 自定义属性，只能断言
  const delayVars: CSSProperties =
    delay > 0 ? ({ ['--reveal-delay' as string]: `${delay}s` } as unknown as CSSProperties) : {};

  return createElement(
    as,
    {
      ref,
      id,
      'data-visible': visible,
      className: cn('reveal', className),
      style: delay > 0 || style ? { ...delayVars, ...style } : undefined,
    },
    children,
  );
}

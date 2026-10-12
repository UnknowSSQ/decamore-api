'use client';
/** 用 position:fixed + getBoundingClientRect 定位，不受父级 overflow 裁剪；
 *  120ms 延迟，鼠标扫过一串按钮时不至于刷屏 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/utils/cn';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

const OFFSET = 8;
const DELAY_MS = 120;
const MAX_WIDTH = 240;

export function Tooltip({ content, children }: TooltipProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setCoords(null);
  }, []);

  const show = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setCoords({ left: rect.left + rect.width / 2, top: rect.top - OFFSET });
    }, DELAY_MS);
  }, []);

  // 滚动 / 缩放后位置失效，直接收起（比重新计算更稳，也不会闪烁）
  useEffect(() => {
    if (!coords) return;
    const handler = () => cancel();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [coords, cancel]);

  useEffect(() => cancel, [cancel]);

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={show}
        onMouseLeave={cancel}
        onFocus={show}
        onBlur={cancel}
        // 触屏：首次点按即显示，再次点按执行原有操作
        onClick={show}
        onKeyDown={(event) => {
          if (event.key === 'Escape') cancel();
        }}
      >
        {children}
      </span>
      {coords && (
        <span
          role="tooltip"
          style={{ position: 'fixed', left: coords.left, top: coords.top, transform: 'translate(-50%, -100%)', maxWidth: MAX_WIDTH }}
          className="z-[80] pointer-events-none rounded-lg bg-ink px-2.5 py-1.5 text-[11px] font-medium leading-snug text-surface shadow-pop animate-fade-in"
        >
          {content}
        </span>
      )}
    </>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex min-w-[20px] items-center justify-center rounded-[6px] border border-line bg-bg-soft px-1.5 py-0.5 font-mono text-[10.5px] text-muted',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

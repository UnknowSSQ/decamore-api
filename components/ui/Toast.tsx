'use client';
/** 状态在 hooks/useToast，这里只渲染；aria-live=polite：播报但不打断用户输入 */
import { cn } from '@/utils/cn';
import type { ToastTone } from '@/types';
import { ToastContext } from '@/hooks/useToast';
import { useContext } from 'react';

const TONE_STYLE: Record<ToastTone, { bar: string; icon: string; mark: string }> = {
  success: { bar: 'bg-ok', icon: 'text-ok', mark: '✓' },
  error: { bar: 'bg-danger', icon: 'text-danger', mark: '!' },
};

export function ToastViewport() {
  const ctx = useContext(ToastContext);
  if (!ctx) return null;
  const { toasts, dismiss } = ctx;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[min(340px,calc(100vw-32px))] flex-col gap-2"
    >
      {toasts.map((toast) => {
        const style = TONE_STYLE[toast.tone];
        return (
          <div
            key={toast.id}
            className="pointer-events-auto overflow-hidden rounded-md border border-line bg-surface shadow-pop animate-toast-in"
          >
            <div className="flex items-start gap-2.5 px-3.5 py-3">
              <span
                aria-hidden
                className={cn('mt-[1px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border border-line text-[10px] font-bold leading-none', style.icon)}
              >
                {style.mark}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold leading-snug text-ink">
                  {toast.title}
                  {toast.count > 1 && <span className="ml-1.5 text-[11px] font-normal text-muted">×{toast.count}</span>}
                </p>
                {toast.description && (
                  <p className="mt-1 break-words text-[11.5px] leading-relaxed text-muted">{toast.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="关闭提示"
                className="-mr-1 -mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px] leading-none text-muted transition-colors hover:bg-bg-soft hover:text-ink"
              >
                ×
              </button>
            </div>
            {toast.duration > 0 && (
              <span
                aria-hidden
                className={cn('block h-[2px] origin-left animate-toast-progress', style.bar)}
                style={{ animationDuration: `${toast.duration}ms` }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

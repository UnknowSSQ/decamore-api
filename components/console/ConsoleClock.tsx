'use client';
/** ready 之前渲染与 SSR 同形的占位文本，避免时钟每秒值引发 hydration 不匹配 */
import { useNow } from '@/hooks/useUi';
import { useSiteFormat } from '@/hooks/useSiteFormat';

export function ConsoleClock() {
  const { now, ready } = useNow();
  const { fmtClock, fmtLongDate } = useSiteFormat();

  return (
    <div className="hidden items-center gap-2 text-[12px] text-muted lg:flex" aria-hidden={!ready}>
      <span className="font-mono text-[13px] font-semibold text-ink">
        {ready ? fmtClock(now) : '00:00:00'}
      </span>
      <span className="text-[11px] text-muted">
        {ready ? fmtLongDate(now) : '加载中'}
      </span>
    </div>
  );
}

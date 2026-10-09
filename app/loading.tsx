/**
 * 骨架形状刻意贴近真实内容（大标题 + 段落 + 卡片网格），把 CLS 抖动压到最小。
 * 不加 'use client'：纯静态 DOM，留在 Server Component 体积最小。
 */
import { Skeleton } from '@/components/ui';

export default function Loading() {
  return (
    <div className="min-h-screen bg-bg pt-[var(--header-h)]">
      <div className="wrap flex flex-col gap-dsp-5 py-dsp-6">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-4 w-28 rounded-full" />
          <Skeleton className="h-12 w-[min(560px,100%)]" />
          <Skeleton className="h-4 w-[min(420px,100%)]" />
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-dsp-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-lg border border-line bg-surface p-dsp-4">
              <div className="flex flex-col gap-3">
                <Skeleton className="h-5 w-2/5" />
                <Skeleton className="h-3.5 w-4/5" />
                <Skeleton className="h-[92px] w-full rounded-md" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-7 w-20 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="sr-only" role="status">
        页面加载中
      </p>
    </div>
  );
}

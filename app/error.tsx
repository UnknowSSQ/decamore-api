'use client';
/**
 * error.tsx 要挂 reset() 按钮，所以必须是 Client Component。
 * 对外只给 digest：dev 才展示 error.message，堆栈留在服务端日志里，前端不重复泄漏。
 */
import { useEffect } from 'react';

import { Button } from '@/components/ui';
import { APP_NAME, ROUTES } from '@/constants/app';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // 打到浏览器控制台，便于对照服务端 digest
  useEffect(() => {
    console.error(`[${APP_NAME}] 页面渲染异常`, error);
  }, [error]);

  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-bg px-6 py-dsp-6">
      <div className="panel w-full max-w-[520px] p-dsp-5 text-center">
        <span aria-hidden className="mx-auto mb-4 block font-serif text-[42px] italic leading-none text-primary">
          !
        </span>
        <h1 className="text-[19px] font-semibold text-ink">页面出了点问题</h1>
        <p className="mx-auto mt-2 max-w-[38ch] text-[12.5px] leading-relaxed text-muted">
          请求没有正常完成。可能是服务暂时不可用，或这次操作的数据有问题。稍后重试通常就会恢复。
        </p>

        {error.digest && (
          <p className="mt-3 font-mono text-[11px] text-muted/80">
            错误编号 <code className="rounded bg-bg-soft px-1.5 py-0.5">{error.digest}</code>
            <span className="mt-1 block text-[11px]">报障时请附上这个编号，我们可以据此定位服务端日志。</span>
          </p>
        )}

        {isDev && error.message && (
          <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-bg-soft p-3 text-left font-mono text-[11px] leading-relaxed text-ink/80">
            {error.message}
          </pre>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={reset}>重新加载</Button>
          <Button variant="outline" onClick={() => (window.location.href = ROUTES.home)}>
            返回首页
          </Button>
        </div>
      </div>
    </div>
  );
}

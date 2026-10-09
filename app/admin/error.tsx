/** 控制台子树的错误边界；reset() 只能在客户端调用 */
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Panel';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('[AdminError]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        mark="⚠"
        title="页面加载失败"
        description={error.message || '发生了未知错误，请稍后重试'}
        action={
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => router.push('/admin/dashboard')}>
              返回仪表盘
            </Button>
            <Button variant="primary" onClick={reset}>
              重试
            </Button>
          </div>
        }
      />
    </div>
  );
}

import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Panel';

export default function AdminNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        mark="⌕"
        title="页面未找到"
        description="您访问的页面不存在或已被移除"
        action={
          <Link href="/admin/dashboard">
            <Button variant="primary">返回仪表盘</Button>
          </Link>
        }
      />
    </div>
  );
}

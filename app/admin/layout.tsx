/**
 * guardPage() 在服务端鉴权，未登录跳 /login?redirect=…，AuthUser 以纯数据传给 Client Component。
 * metadata 用 absolute 覆盖根模板，控制台不带品牌后缀。
 */
import type { Metadata } from 'next';

import { ConsoleShell } from '@/components/console/ConsoleShell';
import { guardPage } from '@/lib/server/guards';

export const metadata: Metadata = {
  title: { absolute: '控制台 · Decamore API' },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await guardPage();

  return <ConsoleShell user={user}>{children}</ConsoleShell>;
}

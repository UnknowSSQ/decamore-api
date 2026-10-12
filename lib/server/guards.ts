/** Server Component 页面的鉴权入口；API 路由的门禁在 handler.ts，两边各按自己的失败形态处理 */
import 'server-only';

import { redirect } from 'next/navigation';

import { ROUTES } from '@/constants/app';
import { resolveSession } from '@/lib/auth/session';
import type { AuthUser } from '@/types';

interface GuardOptions {
  /** 未登录时跳去哪 */
  redirectTo?: string;
}

/**
 * middleware 跑在 Edge 无法验签，真正的验签只能在这里做。
 * 这里只管「登录没有」，不管「能进哪一页」：权限门禁住在各 API 路由的 `permission` 声明里，
 * 页面即使进了去，取数与写操作也会被 403 挡下；仓库目前只有一个 role 且它握有全部权限，
 * 页面级的权限分支没有可达路径，别在这里预置一份没人走的分支。
 */
export async function guardPage(options: GuardOptions = {}): Promise<AuthUser> {
  const session = await resolveSession();

  if (!session) {
    redirect(`${ROUTES.login}?redirect=${encodeURIComponent(options.redirectTo ?? ROUTES.adminDashboard)}`);
  }

  return session.user;
}

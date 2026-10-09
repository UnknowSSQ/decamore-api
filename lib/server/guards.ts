/** Server Component 页面的鉴权入口；API 路由的门禁在 handler.ts，两边各按自己的失败形态处理 */
import 'server-only';

import { redirect } from 'next/navigation';

import type { Permission } from '@/constants/auth';
import { ROUTES } from '@/constants/app';
import { hasAllPermissions, hasAnyPermission } from '@/lib/auth/permissions';
import { resolveSession } from '@/lib/auth/session';
import type { AuthUser } from '@/types';

export interface GuardOptions {
  /** 全部满足 */
  permission?: Permission | Permission[];
  /** 满足任一即可 */
  anyPermission?: Permission[];
  roles?: readonly string[];
  /** 未登录时跳去哪 */
  redirectTo?: string;
}

/** middleware 跑在 Edge 无法验签，真正的验签只能在这里做 */
export async function guardPage(options: GuardOptions = {}): Promise<AuthUser> {
  const session = await resolveSession();

  if (!session) {
    redirect(`${ROUTES.login}?redirect=${encodeURIComponent(options.redirectTo ?? ROUTES.adminDashboard)}`);
  }

  const perms = session.user.permissions;
  const needList = options.permission ? (Array.isArray(options.permission) ? options.permission : [options.permission]) : [];
  const denied =
    (needList.length > 0 && !hasAllPermissions(perms, needList)) ||
    (options.anyPermission ? !hasAnyPermission(perms, options.anyPermission) : false) ||
    (options.roles ? !options.roles.includes(session.user.role) : false);

  if (denied) {
    // 权限不足时回仪表盘；重定向到被守卫页会死循环
    redirect(ROUTES.adminDashboard);
  }

  return session.user;
}

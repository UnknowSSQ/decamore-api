/** API 路由与 Server Component 守卫共用这里的判断逻辑，避免两端漂移 */
import 'server-only';

import { redirect } from 'next/navigation';

import { COOKIES, CSRF_HEADER, type Permission, type Role } from '@/constants/auth';
import { ROUTES } from '@/constants/app';
import { hasAllPermissions, hasAnyPermission, permissionsOf } from '@/lib/auth/permissions';
import { resolveSession, type ResolvedSession } from '@/lib/auth/session';
import type { AuthUser } from '@/types';
import { ForbiddenError, UnauthorizedError } from './errors';
import { attachUser } from './trace';

export interface GuardOptions {
  /** 全部满足 */
  permission?: Permission | Permission[];
  /** 满足任一即可 */
  anyPermission?: Permission[];
  roles?: readonly string[];
  /** 仅 guardPage 读取；assertAccess 不看这个字段 */
  redirectTo?: string;
}

export async function requireSession(): Promise<ResolvedSession> {
  const session = await resolveSession();
  if (!session) {
    throw new UnauthorizedError('登录状态已失效，请重新登录', '缺少或无效的访问令牌');
  }
  // 回填链路上下文，供日志与统计使用
  attachUser(session.user.id, session.user.role);
  return session;
}

/** @throws UnauthorizedError | ForbiddenError */
export async function assertAccess(
  request: {
    method: string;
    cookies: { get: (name: string) => { value: string } | undefined };
    headers: Headers;
  },
  options: GuardOptions = {},
): Promise<ResolvedSession> {
  const session = await requireSession();

  const perms = session.user.permissions;
  if (options.permission) {
    const list = Array.isArray(options.permission) ? options.permission : [options.permission];
    if (!hasAllPermissions(perms, list)) {
      throw new ForbiddenError('权限不足，无法访问该资源', '缺少权限：' + list.join(' / '));
    }
  }
  if (options.anyPermission && !hasAnyPermission(perms, options.anyPermission)) {
    throw new ForbiddenError('权限不足，无法执行该操作');
  }
  if (options.roles && !options.roles.includes(session.user.role)) {
    throw new ForbiddenError('当前角色无权访问该资源');
  }

  // 纯 token 客户端不带 CSRF Cookie，此时跳过双提交
  const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method);
  const stored = request.cookies.get(COOKIES.csrf)?.value;
  if (isWrite && stored) {
    const sent = request.headers.get(CSRF_HEADER);
    if (!sent || sent !== stored) {
      throw new ForbiddenError('请求校验失败', 'CSRF token 缺失或不匹配，请刷新页面后重试');
    }
  }

  return session;
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

export function buildMockUser(role: Role, name: string): AuthUser {
  return {
    id: `usr_${role}_${name}`,
    account: name,
    email: `${name}@decamore.dev`,
    name,
    role,
    permissions: permissionsOf(role),
    avatarLetter: name.slice(0, 1).toUpperCase(),
    lastLoginAt: new Date().toISOString(),
  };
}

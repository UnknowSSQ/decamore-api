import { defineRoute, ok, UnauthorizedError } from '@/lib/server';
import { loginSchema } from '@/lib/zod/auth.schema';
import { issueSessionTokens, writeSessionCookies } from '@/lib/auth/session';
// CSRF token 属 JWT 层，session.ts 有意不 re-export，保持会话读写与令牌签发分离
import { generateCsrfToken } from '@/lib/auth/jwt';
import { permissionsOf, resolveSafeRedirect } from '@/lib/auth/permissions';
import { ROUTES } from '@/constants/app';
import { findUserByAccount } from '@/lib/server/mock/users';
import type { LoginResult } from '@/types';

export const POST = defineRoute(
  {
    auth: false,
    body: loginSchema,
    route: '/api/v1/auth/login',
    // 比默认 120 次/分收紧，压制单 IP 口令爆破
    rateLimitPerMin: 10,
  },
  async (_req, { body }) => {
    const { account, password, remember, redirect } = body!;

    const user = findUserByAccount(account);
    if (!user || user.password !== password) {
      throw new UnauthorizedError('账号或密码错误', '请检查输入后重试');
    }

    if (user.disabled) {
      throw new UnauthorizedError('账号已被禁用', '请联系管理员');
    }

    const { accessToken, refreshToken, expiresIn } = await issueSessionTokens({
      sub: user.id,
      name: user.account,
      role: user.role,
      remember,
    });

    const csrfToken = generateCsrfToken();
    await writeSessionCookies({ accessToken, refreshToken, csrfToken, remember });

    const result: LoginResult = {
      user: {
        id: user.id,
        account: user.account,
        email: user.email,
        name: user.displayName,
        role: user.role,
        // 权限集与 guard 同源；留空数组会逼前端登录后再打一次 /me
        permissions: permissionsOf(user.role),
        avatarLetter: user.displayName.slice(0, 1).toUpperCase(),
        lastLoginAt: new Date().toISOString(),
      },
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer',
      csrfToken,
      redirectTo: resolveSafeRedirect(redirect, ROUTES.adminDashboard),
    };

    return ok(result, { message: '登录成功' });
  },
);

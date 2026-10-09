/** token 一律走 httpOnly Cookie（JS 读不到，抗 XSS）；依赖 next/headers，只能服务端用 */
import 'server-only';

import { cookies, headers } from 'next/headers';

import { AUTH_HEADER, AUTH_SCHEME, COOKIES, REMEMBER_SECONDS, TOKEN_TYPE, type Permission, type Role } from '@/constants/auth';
import { getServerEnv } from '@/env';
import type { AuthUser } from '@/types';
import { issueToken, verifyToken, type AccessTokenClaims } from './jwt';
import { permissionsOf } from './permissions';

function baseOptions(maxAgeSec: number, path: string) {
  const env = getServerEnv();
  const secure = env.COOKIE_SECURE ?? env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path,
    maxAge: maxAgeSec,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

/** 登录与续期成功后调用 */
export async function writeSessionCookies(params: {
  accessToken: string;
  refreshToken?: string;
  csrfToken?: string;
  remember?: boolean;
}): Promise<void> {
  const store = await cookies();
  const env = getServerEnv();

  store.set(COOKIES.access, params.accessToken, baseOptions(env.JWT_ACCESS_TTL_SEC, '/'));

  if (params.refreshToken) {
    const maxAge = params.remember ? REMEMBER_SECONDS : env.JWT_REFRESH_TTL_SEC;
    // Path 限定到刷新路由，其它请求带不上 refresh
    store.set(COOKIES.refresh, params.refreshToken, baseOptions(maxAge, '/api/v1/auth'));
  }

  if (params.csrfToken) {
    // CSRF Cookie 必须可被 JS 读取（双提交模型）
    store.set(COOKIES.csrf, params.csrfToken, {
      ...baseOptions(env.JWT_ACCESS_TTL_SEC, '/'),
      httpOnly: false,
    });
  }
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  const env = getServerEnv();
  store.set(COOKIES.access, '', baseOptions(0, '/'));
  store.set(COOKIES.refresh, '', baseOptions(0, '/api/v1/auth'));
  store.set(COOKIES.csrf, '', { ...baseOptions(0, '/'), httpOnly: false });
  void env;
}

/** Authorization 头优先（跨域 / 移动端），否则回落 httpOnly Cookie */
export async function readTokenFromRequest(which: 'access' | 'refresh' = 'access'): Promise<string | null> {
  const h = await headers();
  const raw = h.get(AUTH_HEADER);
  if (raw?.startsWith(`${AUTH_SCHEME} `)) {
    const value = raw.slice(AUTH_SCHEME.length + 1).trim();
    // Bearer 头只用于 access；refresh 一律走 Cookie，避免混淆用途
    if (value && which === 'access') return value;
  }

  const store = await cookies();
  return store.get(which === 'access' ? COOKIES.access : COOKIES.refresh)?.value ?? null;
}

export interface ResolvedSession {
  user: AuthUser;
  claims: AccessTokenClaims;
  expiresAt: number;
  /** 令牌来自 Authorization 头而非 Cookie：这类请求不是浏览器自动带凭据，CSRF 双提交不适用 */
  viaHeader: boolean;
}

/** 返回 null 即未登录 / token 非法 / 已过期，调用方据此回 401 */
export async function resolveSession(): Promise<ResolvedSession | null> {
  const token = await readTokenFromRequest('access');
  if (!token) return null;

  const result = await verifyToken(token, TOKEN_TYPE.access);
  if (!result.ok) return null;

  const claims = result.claims as AccessTokenClaims;
  const authHeader = (await headers()).get(AUTH_HEADER);
  return {
    claims,
    expiresAt: claims.exp * 1000,
    viaHeader: Boolean(authHeader?.startsWith(`${AUTH_SCHEME} `)),
    user: buildUser(claims),
  };
}

/** 字段全部由 claims 推导，不查库 */
export function buildUser(claims: { sub: string; name: string; role: Role; iat: number }): AuthUser {
  const permissions: Permission[] = permissionsOf(claims.role);
  return {
    id: claims.sub,
    account: claims.name,
    // 由账号拼出的占位邮箱，不是真实地址
    email: `${claims.name}@decamore.dev`,
    name: claims.name,
    role: claims.role,
    permissions,
    avatarLetter: claims.name.slice(0, 1).toUpperCase() || 'A',
    // 取 iat 而非 new Date()：同一 token 每次解析必须得到相同结果，否则 /auth/me 响应每次都变，前端按 user 做的比较与依赖会失真
    lastLoginAt: new Date(claims.iat * 1000).toISOString(),
  };
}

/** 签发一对 token（登录 / 续期共用） */
export async function issueSessionTokens(params: {
  sub: string;
  name: string;
  role: Role;
  /** 记住我：只延长 refresh 的有效期 */
  remember?: boolean;
}): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const env = getServerEnv();
  const [accessToken, refreshToken] = await Promise.all([
    issueToken({ ...params, type: TOKEN_TYPE.access }),
    issueToken({
      ...params,
      type: TOKEN_TYPE.refresh,
      ttlSec: params.remember ? REMEMBER_SECONDS : env.JWT_REFRESH_TTL_SEC,
    }),
  ]);
  return { accessToken, refreshToken, expiresIn: env.JWT_ACCESS_TTL_SEC };
}

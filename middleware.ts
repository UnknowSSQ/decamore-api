/** 只做 Cookie 存在性检查，不验签：验签与权限判定在 lib/server/guards.ts，这里不是安全边界 */
import { NextResponse, type NextRequest } from 'next/server';

import { COOKIES } from '@/constants/auth';
import { ROUTES } from '@/constants/app';

const PROTECTED_PREFIXES = ['/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Route Handler 复用这个头，保证一次请求只有一个 traceId
  // 形状与 lib/server/trace.ts 的 createTraceId 一致：那边用 node:crypto，Edge 里带不过来，所以两边各自实现同一算法
  const requestId =
    request.headers.get('x-request-id') ??
    `${Date.now().toString(36)}-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  response.headers.set('x-request-id', requestId);

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  const hasAccessCookie = request.cookies.has(COOKIES.access);

  // /api 不在此处鉴权，验签 / 权限 / CSRF 都在 withApiHandler 里
  if (pathname.startsWith('/api')) return response;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !hasAccessCookie) {
    const loginUrl = new URL(ROUTES.login, request.url);
    loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.headers.set('x-request-id', requestId);
    return redirectResponse;
  }

  if (pathname === ROUTES.login && hasAccessCookie) {
    const target = request.nextUrl.searchParams.get('redirect') || ROUTES.adminDashboard;
    const redirectResponse = NextResponse.redirect(new URL(target, request.url));
    redirectResponse.headers.set('x-request-id', requestId);
    return redirectResponse;
  }

  return response;
}

// /api 也在 matcher 内，只为让 API 响应同样带上 x-request-id
export const config = {
  matcher: ['/admin/:path*', '/login', '/api/:path*'],
};

/** API 响应的安全头单点定义：中间件只管页面路由，接口由 withApiHandler 与 preflight 自己带 */
import 'server-only';

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
} as const;

export function applySecurityHeaders<T extends { headers: Headers }>(response: T): T {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(key, value);
  return response;
}

/** 登录 / 续期 / 登出必须关掉 401 自动续期，否则会递归打爆刷新接口 */
import type { LoginResult, MeResult, RefreshResult } from '@/types';
import { API } from './endpoints';
import { http } from './http';
import type { LoginInput } from '@/lib/zod/auth.schema';

/** 成功时服务端已写 httpOnly Cookie；local 模式下响应体额外带 token，由 useAuth 决定落盘 */
export function login(input: LoginInput): Promise<LoginResult> {
  return http.post<LoginResult, LoginInput>(
    API.auth.login,
    input,
    // 此刻还没有会话，既不需要续期也不需要 CSRF
    { skipAuthRefresh: true, anonymous: true, timeoutMs: 20_000 },
  );
}

/** 页面可见性恢复、进入控制台时调用 */
export function refreshSession(): Promise<RefreshResult> {
  return http.post<RefreshResult>(API.auth.refresh, {}, { skipAuthRefresh: true, timeoutMs: 10_000 });
}

export function logout(): Promise<{ redirectedTo: string }> {
  return http.post<{ redirectedTo: string }>(API.auth.logout, {}, { skipAuthRefresh: true });
}

/** 兼作 token 有效性探测，并校准本地 expiresAt */
export function fetchMe(): Promise<MeResult> {
  return http.get<MeResult>(API.auth.me, { skipAuthRefresh: false, timeoutMs: 10_000 });
}

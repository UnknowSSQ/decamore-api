/** Role / Permission 的运行时值在 constants/auth.ts，这里只放纯类型以免类型 ↔ 常量循环依赖 */
import type { Permission, Role } from '@/constants/auth';

/** export type 保证纯类型再导出，不把 constants 的运行时代码拖进 chunk */
export type { Permission, Role } from '@/constants/auth';

/** 前端渲染与权限判断的唯一来源 */
export interface AuthUser {
  id: string;
  account: string;
  email: string;
  name: string;
  role: Role;
  permissions: Permission[];
  avatarLetter: string;
  /** ISO 字符串 */
  lastLoginAt: string;
}

/** POST /api/v1/auth/login 响应 */
export interface LoginResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  csrfToken: string;
  redirectTo: string;
}

/** POST /api/v1/auth/refresh 响应 */
export type RefreshResult = Pick<LoginResult, 'accessToken' | 'expiresIn' | 'tokenType'>;

/** GET /api/v1/auth/me 响应 */
export interface MeResult {
  user: AuthUser;
  expiresAt: number;
  /** 服务端判定临近过期，前端据此决定是否主动续期 */
  shouldRefresh: boolean;
}

export type AuthStatus = 'idle' | 'checking' | 'authenticated' | 'unauthenticated';

/** 默认 cookie，local 是跨域部署兜底 */
export type TokenStorageMode = 'cookie' | 'local';

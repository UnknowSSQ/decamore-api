/** Role / Permission 的运行时值在 constants/auth.ts，这里只放纯类型以免类型 ↔ 常量循环依赖 */
import type { Permission, Role } from '@/constants/auth';

/** export type 保证纯类型再导出，不把 constants 的运行时代码拖进 chunk */
export type { Permission, Role } from '@/constants/auth';

/** 字段即 JWT 标准 claim，勿随意扩展 */
export interface TokenPayload {
  sub: string;
  name: string;
  role: Role;
  /** 防止 refresh token 被当 access token 使用 */
  typ: 'access' | 'refresh';
  /** 单位秒，不是毫秒 */
  iat: number;
  exp: number;
  /** 已签入 token，但服务端没有吊销表读取它 */
  jti: string;
}

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

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  /** 毫秒，由 JWT exp 换算 */
  expiresAt: number;
  /** 是否经「7 天免登录」续期而来 */
  remembered: boolean;
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

/** 服务端忽略 allDevices，只清当前设备会话 */
export interface LogoutOptions {
  allDevices?: boolean;
}

export type AuthStatus = 'idle' | 'checking' | 'authenticated' | 'unauthenticated';

/** 默认 cookie，local 是跨域部署兜底 */
export type TokenStorageMode = 'cookie' | 'local';

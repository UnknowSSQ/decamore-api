/** 密钥与有效期走环境变量（见 /env）；这里只放不敏感且前后端共享的配置 */

/** httpOnly，服务端签发，客户端 JS 读不到，防 XSS 窃取 */
export const COOKIES = {
  access: 'dc_at',
  refresh: 'dc_rt',
  /** 双提交 Cookie，与 X-CSRF-Token 头比对 */
  csrf: 'dc_csrf',
} as const;

export const AUTH_SCHEME = 'Bearer' as const;
export const AUTH_HEADER = 'Authorization' as const;
export const CSRF_HEADER = 'X-CSRF-Token' as const;

/** 默认存储模式是 cookie，localStorage 只用于跨标签页同步与移动端 Bearer 兜底 */
export const STORAGE_KEYS = {
  accessToken: 'decamore.accessToken',
  refreshToken: 'decamore.refreshToken',
  /** 过期时间戳（毫秒），供前端主动续期判断 */
  expiresAt: 'decamore.expiresAt',
  rememberedAccount: 'decamore.rememberedAccount',
} as const;

/** 写入 JWT claim，防止 access 被当 refresh 使用 */
export const TOKEN_TYPE = {
  access: 'access',
  refresh: 'refresh',
} as const;
export type TokenType = (typeof TOKEN_TYPE)[keyof typeof TOKEN_TYPE];

/** 刻意只保留 admin 一种角色 */
export type Role = 'admin';

/** 后端 requirePermission 与前端 usePermission 共用同一套字符串 */
export const PERMISSIONS = {
  apiRead: 'api:read',
  apiWrite: 'api:write',
  ruleRead: 'rule:read',
  ruleWrite: 'rule:write',
  logRead: 'log:read',
  securityWrite: 'security:write',
  settingsWrite: 'settings:write',
  statsRead: 'stats:read',
} as const;
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** 单一来源：前端控制菜单/按钮显隐、后端做接口门禁都读这里，避免两端判断不一致 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: Object.values(PERMISSIONS),
};

/** 单位秒，勾选「7 天内免登录」时 refresh Cookie 的存活时长 */
export const REMEMBER_SECONDS = 7 * 24 * 60 * 60;

/** 提前触发续期的毫秒数，避免卡在过期边界 */
export const REFRESH_LEEWAY_MS = 60_000;

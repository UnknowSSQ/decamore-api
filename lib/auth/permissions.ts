/** 鉴权判断的唯一真值，零依赖：前端 usePermission 与后端 withAuth 都调这里 */
import { PERMISSIONS, ROLE_PERMISSIONS, type Permission, type Role } from '@/constants/auth';

export function permissionsOf(role: Role | undefined): Permission[] {
  if (!role) return [];
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}

export function hasPermission(permissions: readonly Permission[], permission: Permission): boolean {
  return permissions.includes(permission);
}

export function hasAnyPermission(permissions: readonly Permission[], list: readonly Permission[]): boolean {
  return list.some((p) => permissions.includes(p));
}

export function hasAllPermissions(permissions: readonly Permission[], list: readonly Permission[]): boolean {
  return list.every((p) => permissions.includes(p));
}

/** 防开放重定向：只接受单个 "/" 开头的站内路径，其余一律回落 fallback */
export function resolveSafeRedirect(raw: string | null | undefined, fallback: string): string {
  if (!raw) return fallback;
  const isInternal = raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\');
  if (!isInternal || !/^[\w\-./?=&#%+]+$/.test(raw)) return fallback;
  return raw;
}

/** 用户名长度规则与 Zod schema 保持一致 */
export type AccountKind = 'email' | 'username' | 'invalid';

export function detectAccountKind(account: string): AccountKind {
  const value = account.trim();
  if (!value) return 'invalid';
  if (value.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? 'email' : 'invalid';
  }
  return /^[A-Za-z0-9_.-]{3,32}$/.test(value) ? 'username' : 'invalid';
}

/** UI 展示用；与 constants/auth 的同名表是两份 */
export const PERMISSION_LABELS: Record<Permission, string> = {
  [PERMISSIONS.apiRead]: '查看接口',
  [PERMISSIONS.apiWrite]: '管理接口',
  [PERMISSIONS.ruleRead]: '查看规则',
  [PERMISSIONS.ruleWrite]: '管理规则',
  [PERMISSIONS.logRead]: '查看日志',
  [PERMISSIONS.securityWrite]: '安全配置',
  [PERMISSIONS.settingsWrite]: '站点设置',
  [PERMISSIONS.statsRead]: '查看统计',
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: '超级管理员',
};

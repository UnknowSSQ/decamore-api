'use client';
/** 只影响 UI 显隐：前端隐藏按钮 ≠ 授权，服务端 withApiHandler 照样会 403 */
import { useCallback, useMemo } from 'react';

import { hasAllPermissions, hasAnyPermission } from '@/lib/auth/permissions';
import { PERMISSION_LABELS, type Permission, type Role } from '@/constants/auth';
import { useAuth } from './useAuth';

export function usePermission() {
  const { user, status, hydrated } = useAuth();

  const can = useCallback(
    (permission: Permission | Permission[]): boolean => {
      if (!user) return false;
      // 传数组按「全部满足」判定，不是任一命中
      return Array.isArray(permission) ? hasAllPermissions(user.permissions, permission) : hasAnyPermission(user.permissions, [permission]);
    },
    [user],
  );

  const canAny = useCallback(
    (list: Permission[]): boolean => Boolean(user) && hasAnyPermission(user?.permissions ?? [], list),
    [user],
  );

  const canAll = useCallback(
    (list: Permission[]): boolean => Boolean(user) && hasAllPermissions(user?.permissions ?? [], list),
    [user],
  );

  const isReady = status === 'authenticated' && hydrated;

  return {
    can,
    canAny,
    canAll,
    isReady,
    role: user?.role,
    permissions: user?.permissions ?? [],
    labelOf: (permission: Permission) => PERMISSION_LABELS[permission] ?? permission,
    isRole: (role: Role | Role[]) => {
      if (!user) return false;
      return Array.isArray(role) ? role.includes(user.role) : user.role === role;
    },
  };
}

export function useCan(permission: Permission | Permission[]): boolean {
  const { can } = usePermission();
  // 不套 useMemo：判断本身只是数组包含，缓存没有收益
  return can(permission);
}

export function usePermissionLabels(): string[] {
  const { user } = useAuth();
  return useMemo(() => (user?.permissions ?? []).map((p) => PERMISSION_LABELS[p] ?? p), [user]);
}

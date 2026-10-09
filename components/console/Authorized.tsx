'use client';
/** 只控制 UI 显隐，不构成授权：请求仍由服务端 withApiHandler 校验 */
import type { ReactNode } from 'react';

import { usePermission } from '@/hooks/usePermission';
import type { Permission } from '@/types';

export interface AuthorizedProps {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Authorized({ permission, children, fallback = null }: AuthorizedProps) {
  const { can } = usePermission();
  return <>{can(permission) ? children : fallback}</>;
}

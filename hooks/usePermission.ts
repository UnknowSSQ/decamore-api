'use client';
/** 只影响 UI 显隐：前端隐藏按钮 ≠ 授权，服务端 withApiHandler 照样会 403。
 *  判定本身住在 AuthProvider 的 can 里（读同一份 user.permissions），这里只是省去每个视图自己取 context */
import { useAuth } from './useAuth';
import type { Permission } from '@/constants/auth';

export function useCan(permission: Permission): boolean {
  return useAuth().can(permission);
}

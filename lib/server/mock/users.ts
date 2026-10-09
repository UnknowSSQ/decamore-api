/** 演示用户只有 admin 一个账号，密码是硬编码明文 */

import type { Role } from '@/constants/auth';

export interface MockUser {
  id: string;
  account: string;
  email: string;
  displayName: string;
  /** 明文，未做 hash */
  password: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  disabled: boolean;
}

export const MOCK_USERS: MockUser[] = [
  {
    id: 'usr_001',
    account: 'admin',
    email: 'admin@decamore.dev',
    displayName: 'Admin',
    password: 'Decamore@2026',
    role: 'admin',
    createdAt: '2025-06-01T08:00:00.000Z',
    updatedAt: '2026-10-01T10:30:00.000Z',
    lastLoginAt: '2026-10-07T02:15:00.000Z',
    disabled: false,
  },
];

export function findUserByAccount(account: string): MockUser | undefined {
  return MOCK_USERS.find((u) => u.account === account);
}

export function findAllUsers(): MockUser[] {
  return MOCK_USERS;
}

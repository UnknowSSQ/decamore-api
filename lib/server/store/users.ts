/** 控制台账号表：只有一个演示账号，口令以 scrypt 哈希存储，仅用于本地登录 */
import 'server-only';

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import type { Role } from '@/constants/auth';

interface ConsoleAccount {
  id: string;
  account: string;
  email: string;
  displayName: string;
  /** scrypt 哈希，格式 `scrypt$<saltBase64>$<hashBase64>`；绝不落明文 */
  passwordHash: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  disabled: boolean;
}

const DEMO_PLAIN = '7905207y';

/** 种子账号名：用例与说明都读它，别在测试里再写一遍字面量（换账号时只会红一处） */
export const SEED_ACCOUNT = '7905207';

/** 哈希格式：scrypt$<saltB64>$<hashB64>，salt 每次生成，hash 长度 64 */
function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

/** 恒定时间比较，避免口令比对被计时侧信道利用 */
export function verifyPassword(stored: string, plain: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1]!, 'base64');
  const expected = Buffer.from(parts[2]!, 'base64');
  const actual = scryptSync(plain, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function seedAccounts(): ConsoleAccount[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'usr_001',
      account: SEED_ACCOUNT,
      email: '7905207@qq.com',
      displayName: 'Decamore',
      passwordHash: hashPassword(DEMO_PLAIN),
      role: 'admin',
      createdAt: '2025-06-01T08:00:00.000Z',
      updatedAt: now,
      lastLoginAt: '2026-10-07T02:15:00.000Z',
      disabled: false,
    },
  ];
}

// 内存单例：与项目「无数据库」的设计一致，重启即回到演示口令
const ACCOUNTS: ConsoleAccount[] = seedAccounts();

export function findUserByAccount(account: string): ConsoleAccount | undefined {
  return ACCOUNTS.find((u) => u.account === account);
}

/** 改密：命中账号才重算哈希并返回 true，未命中返回 false */
export function updatePassword(account: string, newPlain: string): boolean {
  const user = findUserByAccount(account);
  if (!user) return false;
  user.passwordHash = hashPassword(newPlain);
  user.updatedAt = new Date().toISOString();
  return true;
}

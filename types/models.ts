/** 持久化形态；对外视图模型在 types/domain.ts，两边字段不必一一对应 */

import type { Role, Permission } from '@/constants/auth';
import type { HttpMethod, ApiCategory } from './domain';

export interface User {
  id: string;
  account: string;
  email: string;
  /** bcrypt/argon2 哈希，绝不返回给前端 */
  passwordHash: string;
  displayName: string;
  role: Role;
  permissions: Permission[];
  disabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  userId: string;
  permissions: Permission[];
  rateLimit: number;
  enabled: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface CallLogRecord {
  id: string;
  time: string;
  path: string;
  method: HttpMethod;
  status: number;
  latencyMs: number;
  ip: string;
  region: string;
  caller: string;
  ua: string;
  cacheHit: boolean;
  traceId?: string;
  userId?: string;
  apiKeyId?: string;
}

export interface Rule {
  id: string;
  name: string;
  scope: string;
  limit: number;
  periodSec: number;
  action: '429' | 'reject' | 'captcha' | 'log';
  enabled: boolean;
  exemptKeys: string[];
  hitsToday: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiRecord {
  id: string;
  path: string;
  name: string;
  method: HttpMethod;
  category: ApiCategory;
  description: string;
  authRequired: boolean;
  rateLimited: boolean;
  upstream: string;
  cacheSec: number;
  calls24h: number;
  avgLatencyMs: number;
  errorRate: number;
  status: 'online' | 'degraded' | 'offline';
  createdAt: string;
  updatedAt: string;
}

export interface Setting {
  key: string;
  value: string;
  updatedAt: string;
}

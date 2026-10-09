import 'server-only';

import { getServerEnv } from '@/env';

export interface DbStub {
  _stub: true;
}

let cached: DbStub | null = null;

/** 恒返回占位对象，未接任何驱动 */
export function getDb(): DbStub {
  if (!cached) {
    cached = { _stub: true };
  }
  return cached;
}

/** 只看 DATABASE_URL 是否配置，不代表连接可用 */
export function isDatabaseConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.DATABASE_URL);
}

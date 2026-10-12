import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { ENV_KEYS } from '@/env';

/**
 * 注释行也算「写进了示例文件」：COOKIE_DOMAIN、COOKIE_SECURE、REDIS_URL 都是可选键，
 * 示例里刻意留成注释，等要跨子域共享会话或切 redis 时解开即可。
 */
const exampleKeys = (source: string): string[] =>
  [...source.matchAll(/^[ \t]*#?[ \t]*(?:export[ \t]+)?([A-Z][A-Z0-9_]*)[ \t]*=/gm)].map((match) => match[1]!);

describe('.env.example 与 env schema 一致', () => {
  const keys = exampleKeys(readFileSync(path.join(process.cwd(), '.env.example'), 'utf8'));

  it('schema 里每个键都在示例文件里出现（含注释掉的可选键）', () => {
    for (const key of ENV_KEYS) {
      assert.ok(keys.includes(key), `.env.example 缺 ${key}：新增环境变量要同步写进示例文件`);
    }
  });

  it('示例文件不留着 schema 已经不认的键', () => {
    for (const key of keys) {
      assert.ok(ENV_KEYS.includes(key), `.env.example 里的 ${key} 在 schema 中不存在，应一并删掉`);
    }
  });
});

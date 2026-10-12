/**
 * 走 loadEnv() 而非 getServerEnv()：校验用的仍是 env/index.ts 那份 Zod schema，不会出现「脚本过了、运行挂了」。
 * 只打印字段名与结论，绝不打印变量值，免得 CI 日志泄漏密钥。
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { loadEnv } from '../env';

/** 只支持 KEY=VALUE / 注释 / export 前缀，够用即可，不引第三方 */
function parseDotEnv(file: string): Record<string, string> {
  const source = readFileSync(file, 'utf8');
  const result: Record<string, string> = {};
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1];
    let value = (match[2] ?? '').trim();
    // 去掉成对引号；未加引号时截掉行尾注释
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    if (key) result[key] = value;
  }
  return result;
}

const candidates = ['.env.local', '.env'];
const merged: Record<string, string> = {};
const used: string[] = [];

for (const name of candidates) {
  const path = resolve(process.cwd(), name);
  if (!existsSync(path)) continue;
  used.push(name);
  // .env.local 优先于 .env：后写入者覆盖
  Object.assign(merged, parseDotEnv(path));
}

// 进程真实环境优先级最高（CI/容器注入）
const source: Record<string, string | undefined> = { ...merged, ...process.env };

console.log('▶ Decamore API · 环境变量自检');
console.log(`  已读取：${used.length > 0 ? used.join('、') : '（无 .env 文件，仅使用进程环境变量）'}`);

let env: ReturnType<typeof loadEnv>;
try {
  env = loadEnv(source as NodeJS.ProcessEnv);
} catch (error: unknown) {
  console.error(`\n✗ ${error instanceof Error ? error.message : '环境变量校验失败'}`);
  console.error('\n  请复制 .env.example → .env.local 并填写缺失字段。');
  process.exit(1);
}

console.log('\n✓ 环境变量校验通过');
console.log(`  NODE_ENV=${env.NODE_ENV}  JWT_ACCESS_TTL_SEC=${env.JWT_ACCESS_TTL_SEC}  JWT_REFRESH_TTL_SEC=${env.JWT_REFRESH_TTL_SEC}`);
console.log(`  RATE_LIMIT_PER_MIN=${env.RATE_LIMIT_PER_MIN}  LOG_LEVEL=${env.LOG_LEVEL}`);
console.log(`  NEXT_PUBLIC_SITE_URL=${env.NEXT_PUBLIC_SITE_URL ?? '(未设置)'}`);

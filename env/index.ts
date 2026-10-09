/**
 * 用 Zod 一次校验后导出类型安全、非空的 env；失败就在启动阶段抛错并列出全部缺失项，不留到某个接口才 500。
 * 服务端私有变量一律不带 NEXT_PUBLIC_ 前缀。
 */
import { z } from 'zod';

/** NEXT_PUBLIC_ 会被内联进浏览器 bundle，只放可公开的值 */
const publicEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  /** 同域部署留空即可 */
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional().or(z.literal('')),
  /** metadata / OG 用 */
  NEXT_PUBLIC_SITE_URL: z.string().url().optional().or(z.literal('')),
  /** next.config.ts 的 remotePatterns 读它 */
  NEXT_PUBLIC_ALLOWED_IMAGE_HOST: z.string().min(1).optional(),
});

/** .env.example 里的那行示例值，原样带进部署就等于没有密钥 */
const SAMPLE_JWT_SECRET = 'dev-only-secret-change-me-please-32bytes-min';

/** 切勿在客户端组件中引用 */
const privateEnvSchema = z.object({
  /** HS256 的密钥长度下限 */
  JWT_SECRET: z
    .string()
    .min(32, { message: 'JWT_SECRET 至少 32 个字符，请用 `openssl rand -base64 48` 生成' })
    /** 示例值进了生产等于没有密钥：长度校验拦不住它，只能按字面拒绝 */
    .refine(
      (value) => process.env.NODE_ENV !== 'production' || value !== SAMPLE_JWT_SECRET,
      { message: '生产环境不得沿用 .env.example 里的示例 JWT_SECRET' },
    ),
  JWT_ACCESS_TTL_SEC: z.coerce.number().int().min(60).max(3600).default(900),
  JWT_REFRESH_TTL_SEC: z.coerce.number().int().min(3600).max(2_592_000).default(604_800),
  /** 只在跨子域共享时设置，需带前导点（如 .decamore.dev） */
  COOKIE_DOMAIN: z.string().min(1).optional(),
  /** 未设置时由 session.ts 按 NODE_ENV 决定 */
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  API_STATS_PERSIST: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  /** 按单 IP 计数 */
  RATE_LIMIT_PER_MIN: z.coerce.number().int().min(1).max(10_000).default(120),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type PrivateEnv = z.infer<typeof privateEnvSchema>;
export type Env = PublicEnv & PrivateEnv;

let cached: Env | null = null;

/** @throws 校验失败，报错含全部字段错误明细 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const publicParsed = publicEnvSchema.safeParse(source);
  const privateParsed = privateEnvSchema.safeParse(source);

  if (!publicParsed.success || !privateParsed.success) {
    const issues = [
      ...(publicParsed.success ? [] : publicParsed.error.issues),
      ...(privateParsed.success ? [] : privateParsed.error.issues),
    ];
    const detail = issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new Error(
      `环境变量校验失败，请检查 .env.local（示例见 .env.example）：\n${detail}`,
    );
  }

  if (privateParsed.data.JWT_SECRET === SAMPLE_JWT_SECRET && publicParsed.data.NODE_ENV !== 'production') {
    warnOnce(
      'JWT_SECRET 仍是 .env.example 里的示例值，本地调试可以，但部署前必须换成随机串（openssl rand -base64 48）。',
    );
  }

  return { ...publicParsed.data, ...privateParsed.data };
}

let sampleSecretWarned = false;

/** 每次请求都会读 env，提醒只发一次 */
function warnOnce(message: string): void {
  if (sampleSecretWarned) return;
  sampleSecretWarned = true;
  console.warn(`[env] ${message}`);
}

/** 单例，首次调用即校验；故意不 try/catch，缺关键变量时要阻断启动 */
export function getServerEnv(): Env {
  if (!cached) cached = loadEnv();
  return cached;
}

/**
 * 客户端入口，只暴露 NEXT_PUBLIC_ 变量；在浏览器里引用 getServerEnv() 会把密钥打进 bundle。
 * 逐键读取而非整体 safeParse，因为 Next 只内联 NEXT_PUBLIC_*，客户端的 process.env 并不完整。
 */
export function getClientEnv(): PublicEnv {
  const source = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_ALLOWED_IMAGE_HOST: process.env.NEXT_PUBLIC_ALLOWED_IMAGE_HOST,
  };
  const parsed = publicEnvSchema.safeParse(source);
  if (!parsed.success) {
    // 公共变量缺失不致命，回落默认值继续跑
    console.warn('[env] 公共环境变量未完全配置，使用默认值：', parsed.error.flatten().fieldErrors);
    return publicEnvSchema.parse({ NODE_ENV: process.env.NODE_ENV });
  }
  return parsed.data;
}

/** 未配置时回落到本地 */
export function siteUrl(): string {
  return getClientEnv().NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}

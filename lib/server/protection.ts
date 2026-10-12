/** 运行时安全策略执行：IP 黑白名单、访问规则、CORS 头、请求体上限都从这里读后台配置 */
import 'server-only';

import { NextResponse } from 'next/server';

import { createKvWindowStore, type WindowStore } from '@/utils/rate-window';
import { ipInList, originAllowed } from '@/utils/net';
import { getServerEnv } from '@/env';
import { getSecuritySettings } from './store/security';
import { recordRuleHit, rulesForPath } from './store/rules';
import { ApiError, ForbiddenError, RateLimitError } from './errors';
import { logger } from './logger';
import { applySecurityHeaders } from './security-headers';
import { resolveClientIp } from './trace';
import { getKvStore } from './store/kv';

/**
 * 限流桶走 KvStore：默认 memory 后端挂在 globalThis，单实例下与旧实现一致；
 * 切到 redis 后端后计数跨实例共享，限额不再被实例数放大。
 */
const windows: WindowStore = createKvWindowStore(getKvStore());

/** 每次判定都现读后台：这里只把单位换算和取值归一，不做缓存，改完配置下一个请求就生效 */
function policy() {
  const settings = getSecuritySettings();
  return {
    blacklist: settings.ipBlacklist,
    whitelist: settings.ipWhitelist,
    corsOrigins: settings.corsOrigins,
    maxBodyBytes: Math.max(1, settings.maxBodySizeKb) * 1024,
    globalRateLimit: settings.globalRateLimit,
  };
}

export interface GuardInput {
  ip: string;
  method: string;
  pathname: string;
  /** 路由模板，限额按它计数，避免每个 [id] 各开一个桶 */
  routePattern: string;
}

/** 页面导航不参与这套判定，只作用于 /api；调用方在入口拦掉非 API 路径 */
export function enforceIpLists(ip: string): { exempt: boolean } {
  const current = policy();

  if (ipInList(ip, current.blacklist)) {
    throw new ForbiddenError('请求被拒绝', '该来源地址在 IP 黑名单中');
  }

  return { exempt: ipInList(ip, current.whitelist) };
}

/** 跨域头只在请求带了 Origin 且配置里允许时下发；不开 Allow-Credentials，控制台接口仍是同源用 */
export function corsHeadersFor(origin: string | null): Record<string, string> {
  if (!origin) return {};
  if (!originAllowed(origin, policy().corsOrigins)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    Vary: 'Origin',
  };
}

/** 预检响应：公开接口免鉴权，只声明方法与允许的自定义头 */
const PREFLIGHT_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '600',
};

/**
 * 公开接口的 OPTIONS 预检工厂。来源不在配置里时只回 204 而不带跨域头，
 * 浏览器据此判定预检失败，效果等同于未配置。
 *
 * 此前它是整条管线的旁路：被拉黑的 IP 照样能无限打预检，既不计频控也不进任何统计，
 * 而浏览器在每个跨域 GET 前都会自动发一个，等于免费的流量放大。
 * 这里只补 IP 黑名单与限额——预检没有会话，鉴权 / CSRF / 参数校验本来就不适用。
 * 抛错就地转状态码：OPTIONS 不经 withApiHandler，没有别人兜错误信封。
 */
export function preflight() {
  return async (request: Request): Promise<NextResponse> => {
    const ip = resolveClientIp(request.headers);
    try {
      const { exempt } = enforceIpLists(ip);
      if (!exempt) {
        await enforceDefaultLimit(
          { ip, method: 'OPTIONS', pathname: new URL(request.url).pathname, routePattern: '*' },
          getServerEnv().RATE_LIMIT_PER_MIN,
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        return applySecurityHeaders(new NextResponse(null, { status: error.status, headers: error.headers }));
      }
      throw error;
    }

    const cors = corsHeadersFor(request.headers.get('origin'));
    return applySecurityHeaders(
      new NextResponse(null, {
        status: 204,
        headers: { ...cors, ...PREFLIGHT_HEADERS, 'Cache-Control': 'no-store, max-age=0' },
      }),
    );
  };
}

export function maxBodyBytes(): number {
  return policy().maxBodyBytes;
}

/** 后台的全局限额与默认限额并行：前者按配置周期累计，后者按分钟按路由计 */
export async function enforceDefaultLimit(input: GuardInput, limitPerMin: number): Promise<void> {
  const now = Date.now();
  const { globalRateLimit } = policy();

  const globalDecision = await windows.tryConsume(
    `global|${input.ip}`,
    globalRateLimit.limit,
    globalRateLimit.periodSec * 1000,
    now,
  );
  if (!globalDecision.allowed) {
    throw new RateLimitError(globalDecision.retryAfterSec, '命中全局流量上限');
  }

  const decision = await windows.tryConsume(
    `default|${input.ip}|${input.method}|${input.routePattern}`,
    limitPerMin,
    60_000,
    now,
  );
  if (!decision.allowed) throw new RateLimitError(decision.retryAfterSec);
}

/**
 * 取作用域最具体的一条启用规则生效（与 WAF 的首条命中一致），而不是把所有命中规则叠加热量：
 * 叠加会让 global 规则把精确规则挤成摆设。
 */
export async function enforceAccessRules(input: GuardInput): Promise<void> {
  const rule = rulesForPath(input.pathname)[0];
  if (!rule) return;

  const now = Date.now();
  const decision = await windows.tryConsume(`rule|${rule.id}|${input.ip}`, rule.limit, rule.periodSec * 1000, now);
  if (decision.allowed) return;

  recordRuleHit(rule.id);
  logger.warn({
    event: 'rule.triggered',
    message: `规则「${rule.name}」拦截 ${input.method} ${input.pathname}`,
    meta: { ruleId: rule.id, action: rule.action, ip: input.ip },
  });

  if (rule.action === 'log') return;
  if (rule.action === 'reject') {
    throw new ForbiddenError('请求被拒绝', `命中访问规则「${rule.name}」`);
  }
  throw new RateLimitError(decision.retryAfterSec, `命中访问规则「${rule.name}」`);
}

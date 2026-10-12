/** Route Handler 统一包装：限流 → 鉴权 → 入参校验 → 业务 → 统计，异常在此兜成标准响应 */
import 'server-only';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z, type ZodTypeAny } from 'zod';

import { COOKIES, CSRF_HEADER, type Permission } from '@/constants/auth';
import { csrfDecision } from '@/utils/csrf';
import { getServerEnv } from '@/env';
import { hasAllPermissions } from '@/lib/auth/permissions';
import { resolveSession, type ResolvedSession } from '@/lib/auth/session';
import { ERROR_CODE, type ErrorCode, type FieldIssue } from '@/types';
import { ApiError, ForbiddenError, UnauthorizedError } from './errors';
import { logger } from './logger';
import {
  corsHeadersFor,
  enforceAccessRules,
  enforceDefaultLimit,
  enforceIpLists,
  maxBodyBytes,
  type GuardInput,
} from './protection';
import { recordApiCall } from './stats';
import { getSiteSettings } from './store/settings';
import { applySecurityHeaders } from './security-headers';
import { buildFailure, buildPublicBody } from './response';
import { compressJson } from './compress';
import { parseBody, parseParams, parseQuery } from './validate';
import { toFieldIssues } from '@/lib/zod/validate-shared';
import { createTraceId, resolveClientIp, runWithRequestContext, type RequestContext } from './trace';

export interface ApiContext {
  /** 配了 params schema 时是校验后的输出，否则是原始动态段 */
  params: Record<string, string>;
  /** auth=true 时必定存在，auth=false 时恒为 null */
  session: ResolvedSession | null;
  /** 未配对应 schema 时为 undefined，body 同理 */
  query: unknown;
  body: unknown;
  traceId: string;
}

type ApiHandler = (request: NextRequest, context: ApiContext) => Promise<NextResponse> | NextResponse;

export interface WithApiOptions {
  /** 默认 true：不显式声明即要求登录 */
  auth?: boolean;
  /** 全部满足 */
  permission?: Permission | Permission[];

  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;

  /** 统计聚合用路由模板（/api/v1/apis/[id]）而非真实 path，避免高基数 */
  route?: string;
  /**
   * 响应体家族，默认 'console'：
   * 'public' 时成功与失败都出单层公开信封，客户端 lib/api 用同名选项配对解析。
   */
  envelope?: 'console' | 'public';
  /** 默认记录 */
  track?: boolean;
  /** 单 IP 每分钟上限，默认取 env.RATE_LIMIT_PER_MIN */
  rateLimitPerMin?: number;
}

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function withApiHandler(handler: ApiHandler, options: WithApiOptions = {}) {
  return async (
    request: NextRequest,
    routeContext: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    const path = request.nextUrl.pathname;
    const method = request.method;
    // 中间件已生成 x-request-id 时复用，保证一次请求一个 ID
    const traceId = request.headers.get('x-request-id') ?? createTraceId();

    const ctx: RequestContext = {
      traceId,
      startedAt: performance.now(),
      startedAtMs: Date.now(),
      method,
      path,
      routePattern: options.route ?? path,
      ip: resolveClientIp(request.headers),
      userAgent: request.headers.get('user-agent') ?? undefined,
      skipStats: options.track === false,
    };

    // 整条链路挂在同一 AsyncLocalStorage 上，统计与日志随处可取 ctx
    return runWithRequestContext(ctx, async () => {
      const isApi = path.startsWith('/api');
      const cors = isApi ? corsHeadersFor(request.headers.get('origin')) : {};
      const guard: GuardInput = {
        ip: ctx.ip ?? '-',
        method,
        pathname: path,
        routePattern: options.route ?? path,
      };

      try {
        if (isApi) {
          // 黑名单先决生死；白名单只豁免频控与规则，不豁免黑名单
          const { exempt } = enforceIpLists(guard.ip);
          if (!exempt) {
            await enforceAccessRules(guard);
            await enforceDefaultLimit(guard, options.rateLimitPerMin ?? getServerEnv().RATE_LIMIT_PER_MIN);
          }
        }

        // 维护模式只挡公开接口：控制台要能进来关开关，文档页是静态的
        if (options.envelope === 'public' && getSiteSettings().maintenanceMode) {
          throw new ApiError(503, ERROR_CODE.SERVICE_UNAVAILABLE, '站点维护中', {
            description: '维护模式已开启，公开接口暂停服务',
          });
        }

        // 先鉴权后校验，免得向未授权者暴露参数规则
        let session: ResolvedSession | null = null;

        if (options.auth !== false) {
          session = await resolveSession();
          if (!session) {
            throw new UnauthorizedError('登录状态已失效，请重新登录', '缺少或无效的访问令牌');
          }
          ctx.userId = session.user.id;
          ctx.role = session.user.role;

          const perms = session.user.permissions;
          if (options.permission) {
            const list = Array.isArray(options.permission) ? options.permission : [options.permission];
            if (!hasAllPermissions(perms, list)) {
              throw new ForbiddenError('权限不足，无法访问该资源', '缺少权限：' + list.join(' / '));
            }
          }
          // cookie 会话下的写操作必须双提交；Bearer 头的会话由 csrfDecision 判为免校验
          const csrf = csrfDecision({
            required: WRITE_METHODS.has(method),
            viaHeader: session.viaHeader,
            header: request.headers.get(CSRF_HEADER),
            cookie: request.cookies.get(COOKIES.csrf)?.value ?? null,
          });
          if (csrf.verdict === 'fail') {
            throw new ForbiddenError('请求校验失败', csrf.reason ?? 'CSRF 校验未通过，请刷新页面后重试');
          }
        }

        const rawParams = (await routeContext?.params) ?? {};
        const query = options.query ? parseQuery(request.nextUrl, options.query) : undefined;
        const body = options.body ? await parseBody(request, options.body, { maxBytes: maxBodyBytes() }) : undefined;
        const params = options.params
          ? await parseParams(Promise.resolve(rawParams), options.params)
          : rawParams;

        const response = await handler(request, {
          params,
          session,
          query,
          body,
          traceId,
        });

        ctx.status = response.status;
        ctx.errorCode = response.status < 400 ? ERROR_CODE.OK : response.status;

        // 统计内部全包 try/catch，永不抛错，不会拖垮响应
        recordApiCall({
          status: response.status,
          errorCode: ctx.errorCode,
        });

        response.headers.set('x-trace-id', traceId);
        return finish(applySecurityHeaders(withCors(response, cors)), request);
      } catch (error: unknown) {
        return finish(
          applySecurityHeaders(withCors(handleFailure(error, traceId, options.envelope), cors)),
          request,
        );
      }
    });
  };
}

/** 出口只做一件事：客户端愿意收 gzip 就压（`next start` 不压 Route Handler 的响应体） */
async function finish(response: NextResponse, request: NextRequest): Promise<NextResponse> {
  return compressJson(response, request.headers.get('accept-encoding'));
}

/** 只有配置命中来源时才有内容，空对象等于不加头 */
function withCors(response: NextResponse, cors: Record<string, string>): NextResponse {
  for (const [key, value] of Object.entries(cors)) response.headers.set(key, value);
  return response;
}

/**
 * 三条分支都会补记调用统计，异常路径不丢点。
 * 失败体的家族由路由的 envelope 决定：公开路由出单层公开信封，控制台出 ApiFailure。
 */
function handleFailure(
  error: unknown,
  traceId: string,
  envelope?: 'console' | 'public',
): NextResponse {
  const isPublic = envelope === 'public';
  const status = error instanceof ApiError ? error.status : error instanceof z.ZodError ? 422 : 500;

  let code: ErrorCode;
  let message: string;
  let description: string | undefined;
  let issues: FieldIssue[] | undefined;
  let extra: { debug?: { stack?: string } } = {};

  if (error instanceof ApiError) {
    code = error.code;
    message = error.message;
    description = error.description;
    issues = error.issues;
    logger[error.status >= 500 ? 'error' : 'warn']({
      event: 'api.error',
      message: error.message,
      error,
      meta: { code: error.code, status: error.status },
    });
  } else if (error instanceof z.ZodError) {
    code = ERROR_CODE.VALIDATION_FAILED;
    message = '请求参数校验失败';
    issues = toFieldIssues(error);
    description = issues[0] ? `${issues[0].field}：${issues[0].message}` : undefined;
    logger.warn({ event: 'api.validation', message: '参数校验失败', error });
  } else {
    code = ERROR_CODE.INTERNAL_ERROR;
    message = '服务器内部错误，请稍后重试';
    description = '我们已记录本次异常，可凭 traceId 联系管理员';
    // 堆栈摘要只在非生产回传，生产不暴露内部实现
    if (getServerEnv().NODE_ENV !== 'production') {
      extra = { debug: { stack: (error as Error)?.stack?.split('\n').slice(0, 6).join('\n') } };
    }
    logger.error({ event: 'api.unhandled', message: '未处理的接口异常', error });
  }

  recordApiCall({ status, errorCode: code });

  const body = isPublic
    ? buildPublicBody({ statusCode: code, message, data: null, description, issues })
    : buildFailure({ code, message, description, issues, ...extra });

  return NextResponse.json(body, { status, headers: { 'x-trace-id': traceId, ...errorHeaders(error) } });
}

/** ApiError 自带响应头（如 429 的 Retry-After），其它错误没有 */
function errorHeaders(error: unknown): Record<string, string> | undefined {
  return error instanceof ApiError ? error.headers : undefined;
}

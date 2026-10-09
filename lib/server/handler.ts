/** Route Handler 统一包装：限流 → 鉴权 → 入参校验 → 业务 → 统计，异常在此兜成标准响应 */
import 'server-only';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z, type ZodTypeAny } from 'zod';

import { COOKIES, CSRF_HEADER, type Permission } from '@/constants/auth';
import { csrfDecision } from '@/utils/csrf';
import { getServerEnv } from '@/env';
import { hasAllPermissions, hasAnyPermission } from '@/lib/auth/permissions';
import { resolveSession, type ResolvedSession } from '@/lib/auth/session';
import { ERROR_CODE, type ApiResponse } from '@/types';
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
import { buildFailure } from './response';
import { parseBody, parseParams, parseQuery, toFieldIssues } from './validate';
import { createTraceId, resolveClientIp, runWithRequestContext, type RequestContext } from './trace';

export interface ApiContext<TExtra> {
  /** 配了 params schema 时是校验后的输出，否则是原始动态段 */
  params: Record<string, string>;
  /** auth=true 时必定存在，auth=false 时恒为 null */
  session: ResolvedSession | null;
  /** 未配对应 schema 时为 undefined，body 同理 */
  query: unknown;
  body: unknown;
  traceId: string;
  extra: TExtra;
}

export type ApiHandler<TExtra> = (
  request: NextRequest,
  context: ApiContext<TExtra>,
) => Promise<NextResponse | ApiResponse<unknown>> | NextResponse | ApiResponse<unknown>;

export interface WithApiOptions<TExtra = Record<string, never>> {
  /** 默认 true：不显式声明即要求登录 */
  auth?: boolean;
  /** 全部满足 */
  permission?: Permission | Permission[];
  /** 满足任一即可 */
  anyPermission?: Permission[];
  roles?: readonly string[];
  /** 默认对写方法开启 */
  csrf?: boolean;

  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;

  /** 统计聚合用路由模板（/api/v1/apis/[id]）而非真实 path，避免高基数 */
  route?: string;
  /** 默认记录 */
  track?: boolean;
  /** 单 IP 每分钟上限，默认取 env.RATE_LIMIT_PER_MIN */
  rateLimitPerMin?: number;

  extra?: TExtra;
  headers?: Record<string, string>;
}

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function withApiHandler<TExtra = Record<string, never>>(
  handler: ApiHandler<TExtra>,
  options: WithApiOptions<TExtra> = {},
) {
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
      requestBytes: Number(request.headers.get('content-length') ?? 0) || undefined,
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
            enforceAccessRules(guard);
            enforceDefaultLimit(guard, options.rateLimitPerMin ?? getServerEnv().RATE_LIMIT_PER_MIN);
          }
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
          if (options.anyPermission && !hasAnyPermission(perms, options.anyPermission)) {
            throw new ForbiddenError('权限不足，无法执行该操作');
          }
          if (options.roles && !options.roles.includes(session.user.role)) {
            throw new ForbiddenError('当前角色无权访问该资源');
          }

          // cookie 会话下的写操作必须双提交；Bearer 头的会话由 csrfDecision 判为免校验
          const csrf = csrfDecision({
            required: options.csrf ?? WRITE_METHODS.has(method),
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

        const result = await handler(request, {
          params,
          session,
          query,
          body,
          traceId,
          extra: (options.extra ?? ({} as TExtra)) as TExtra,
        });

        const response = normalizeResponse(result, options.headers);
        ctx.status = response.status;
        ctx.errorCode = response.status < 400 ? ERROR_CODE.OK : response.status;

        // 统计内部全包 try/catch，永不抛错，不会拖垮响应
        recordApiCall({
          status: response.status,
          errorCode: ctx.errorCode,
          responseBytes: Number(response.headers.get('content-length') ?? 0) || undefined,
        });

        response.headers.set('x-trace-id', traceId);
        return withCors(response, cors);
      } catch (error: unknown) {
        return withCors(handleFailure(error, traceId, options.headers), cors);
      }
    });
  };
}

/** 只有配置命中来源时才有内容，空对象等于不加头 */
function withCors(response: NextResponse, cors: Record<string, string>): NextResponse {
  for (const [key, value] of Object.entries(cors)) response.headers.set(key, value);
  return response;
}

/** 对象返回时状态码由 success 决定：true 走 200，false 用 statusCode */
function normalizeResponse(
  result: NextResponse | ApiResponse<unknown>,
  headers?: Record<string, string>,
): NextResponse {
  if (result instanceof NextResponse) {
    for (const [k, v] of Object.entries(headers ?? {})) result.headers.set(k, v);
    return result;
  }

  const status = result.success ? 200 : result.statusCode;
  return NextResponse.json(result, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      ...headers,
    },
  });
}

/** 三条分支都会补记调用统计，异常路径不丢点 */
function handleFailure(error: unknown, traceId: string, headers?: Record<string, string>): NextResponse {
  if (error instanceof ApiError) {
    const body = buildFailure({
      code: error.code,
      message: error.message,
      description: error.description,
      issues: error.issues,
    });

    logger[error.status >= 500 ? 'error' : 'warn']({
      event: 'api.error',
      message: error.message,
      error,
      meta: { code: error.code, status: error.status },
    });
    recordApiCall({ status: error.status, errorCode: error.code });

    return NextResponse.json(body, {
      status: error.status,
      headers: { 'x-trace-id': traceId, ...error.headers, ...headers },
    });
  }

  if (error instanceof z.ZodError) {
    const issues = toFieldIssues(error);
    const body = buildFailure({
      code: ERROR_CODE.VALIDATION_FAILED,
      message: '请求参数校验失败',
      description: issues[0] ? `${issues[0].field}：${issues[0].message}` : undefined,
      issues,
    });
    recordApiCall({ status: 422, errorCode: ERROR_CODE.VALIDATION_FAILED });
    logger.warn({ event: 'api.validation', message: '参数校验失败', error });
    return NextResponse.json(body, { status: 422, headers: { 'x-trace-id': traceId, ...headers } });
  }

  logger.error({ event: 'api.unhandled', message: '未处理的接口异常', error });
  recordApiCall({ status: 500, errorCode: ERROR_CODE.INTERNAL_ERROR });

  const isProd = getServerEnv().NODE_ENV === 'production';
  const body = buildFailure({
    code: ERROR_CODE.INTERNAL_ERROR,
    message: '服务器内部错误，请稍后重试',
    description: '我们已记录本次异常，可凭 traceId 联系管理员',
    // 堆栈摘要只在非生产回传，生产不暴露内部实现
    debug: isProd ? undefined : { stack: (error as Error)?.stack?.split('\n').slice(0, 6).join('\n') },
  });
  return NextResponse.json(body, { status: 500, headers: { 'x-trace-id': traceId, ...headers } });
}

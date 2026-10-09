/** route 只经 ok / fail / paged 返回，前端 lib/api/request.ts 按同一形状解析 */
import { NextResponse } from 'next/server';

import {
  ERROR_CODE,
  isFailure,
  type ApiFailure,
  type ApiSuccess,
  type ErrorCode,
  type FieldIssue,
  type Paged,
  type PublicApiEnvelope,
  type ResponseMeta,
} from '@/types';
import { APP_NAME } from '@/constants/app';
import { createTraceId, getTraceId } from './trace';

/** 手抄 NextResponse.cookies.set 的 options，避免 import next 内部类型 */
export interface SetCookieDescriptor {
  name: string;
  value: string;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  secure?: boolean;
  path?: string;
  maxAge?: number;
  domain?: string;
}

/** 优先取请求上下文里的 traceId，免得同一请求出现多个 ID */
function resolveTraceId(): string {
  return getTraceId() ?? createTraceId();
}

interface BuildOptions {
  headers?: Record<string, string>;
  cookies?: SetCookieDescriptor[];
}

function buildMeta(): ResponseMeta {
  return { timestamp: Date.now(), traceId: resolveTraceId() };
}

export function buildSuccess<T>(data: T, message = 'success'): ApiSuccess<T> {
  return {
    statusCode: ERROR_CODE.OK,
    success: true,
    message,
    data,
    meta: buildMeta(),
  };
}

export function buildFailure(params: {
  status: number;
  code: ErrorCode;
  message: string;
  description?: string;
  issues?: FieldIssue[];
}): ApiFailure {
  return {
    statusCode: params.code,
    success: false,
    message: params.message,
    ...(params.description ? { description: params.description } : {}),
    ...(params.issues?.length ? { issues: params.issues } : {}),
    data: null,
    meta: buildMeta(),
  };
}

export function ok<T>(data: T, options?: { message?: string } & BuildOptions): NextResponse<ApiSuccess<T>> {
  return json(buildSuccess(data, options?.message ?? 'success'), 200, options);
}

/** HTTP 给 201，响应体 statusCode 仍写 200 */
export function created<T>(data: T, options?: { message?: string } & BuildOptions): NextResponse<ApiSuccess<T>> {
  return json({ ...buildSuccess(data, options?.message ?? 'created'), statusCode: ERROR_CODE.OK }, 201, options);
}

/** 不带响应体，因此也没有 meta / traceId */
export function noContent(options?: BuildOptions): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: options?.headers,
  });
}

/** 业务代码抛 ApiError 即可，一般不用直接调这个 */
export function fail(
  params: { status: number; code: ErrorCode; message: string; description?: string; issues?: FieldIssue[] },
  options?: BuildOptions,
): NextResponse<ApiFailure> {
  return json(buildFailure(params), params.status, options);
}

/** 公开接口走单层信封、无 success 位；控制台内部接口用 ok() */
export function publicOk<T>(
  data: T,
  options?: { message?: string } & BuildOptions,
): NextResponse<PublicApiEnvelope<T>> {
  const body: PublicApiEnvelope<T> = {
    statusCode: ERROR_CODE.OK,
    message: options?.message ?? 'success',
    data,
    meta: {
      requestId: resolveTraceId(),
      serverTime: new Date().toISOString(),
      site: APP_NAME,
    },
  };
  return json(body, 200, options);
}

/** page 从 1 开始 */
export function paged<T>(items: T[], total: number, page: number, pageSize: number): Paged<T> {
  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

function json<T>(body: T, status: number, options?: BuildOptions): NextResponse<T> {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    // 默认不缓存，写接口由业务覆盖
    'Cache-Control': 'no-store, max-age=0',
    ...options?.headers,
  });

  const res = NextResponse.json(body, { status, headers });

  options?.cookies?.forEach((cookie) => {
    const { name, value, ...rest } = cookie;
    res.cookies.set(name, value, rest);
  });
  return res;
}

export { isFailure };

/** route 只经 ok / created / paged / publicOk / noContent 返回；失败体一律由 withApiHandler 调 buildFailure 产出 */
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
  /**
   * 可缓存秒数，只给「同一 URL 必然同一结果」的读接口用。
   * 随机语义的接口（一言、随机壁纸、素材抽样）不能设：浏览器一缓存，
   * 「点击换一张」就会看起来没反应。
   */
  cacheSeconds?: number;
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

/** 失败信封的唯一构造点：HTTP 状态码由调用方决定，这里只产出响应体 */
export function buildFailure(params: {
  code: ErrorCode;
  message: string;
  description?: string;
  issues?: FieldIssue[];
  /** 仅非生产回传的堆栈摘要 */
  debug?: { stack?: string; cause?: string };
}): ApiFailure {
  return {
    statusCode: params.code,
    success: false,
    message: params.message,
    ...(params.description ? { description: params.description } : {}),
    ...(params.issues?.length ? { issues: params.issues } : {}),
    data: null,
    meta: buildMeta(),
    ...(params.debug ? { debug: params.debug } : {}),
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
    // 默认不缓存，读接口按各自的服务端 TTL 显式放开
    'Cache-Control': 'no-store, max-age=0',
    ...(options?.cacheSeconds
      ? {
          'Cache-Control': `private, max-age=${options.cacheSeconds}, stale-while-revalidate=${Math.max(
            15,
            Math.floor(options.cacheSeconds / 2),
          )}`,
        }
      : {}),
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

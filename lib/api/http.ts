/**
 * 前端唯一请求出口：注入鉴权头、401 续期后重放、统一收敛为 RequestError、超时与幂等重试。
 * 不依赖 React，可在 Worker / 测试环境直接复用。
 */
import { AUTH_HEADER, AUTH_SCHEME, CSRF_HEADER, COOKIES } from '@/constants/auth';
import { ERROR_CODE, isSuccess, type ApiResponse, type PublicApiEnvelope } from '@/types';
import { RequestError } from './error';
import { readCsrfFromCookie, tokenStorage } from '@/lib/auth/token-store';

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** 自动跳过 undefined / null，数组序列化为重复键 */
  query?: Record<string, string | number | boolean | undefined | null | string[]>;
  json?: unknown;
  /** 默认 15000 */
  timeoutMs?: number;
  /** 默认 GET 1 次、写请求 0 次 */
  retry?: number;
  /** 关掉 401 自动续期，登录 / 刷新接口自身必须关 */
  skipAuthRefresh?: boolean;
  /** 不注入鉴权头，公开接口用 */
  anonymous?: boolean;
  /** 拿到原始 ApiResponse 而非 data */
  /**
   * 公开接口是单层信封（code/msg/data/requestId/serverTime），没有 success 字段，必须显式声明，
   * 否则会被 success 判定当成失败响应抛出。
   */
  envelope?: 'console' | 'public';
}

function baseUrl(): string {
  // NEXT_PUBLIC_API_BASE_URL 留空即同域部署
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  return envBase && envBase.length > 0 ? envBase.replace(/\/$/, '') : '';
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = baseUrl();
  // 相对 URL 也要有基准：SSR 下没有 window，退占位 origin 以免 new URL 抛错
  const fallbackOrigin = typeof window === 'undefined' ? 'http://localhost:3000' : window.location.origin;
  const url = new URL(`${base}${normalized}`, base || fallbackOrigin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) value.forEach((v) => url.searchParams.append(key, v));
      else url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function withAuthHeaders(init: Headers, anonymous?: boolean): void {
  if (anonymous) return;

  const token = tokenStorage.getAccessToken();
  if (token) init.set(AUTH_HEADER, `${AUTH_SCHEME} ${token}`);

  const csrf = readCsrfFromCookie();
  if (csrf) init.set(CSRF_HEADER, csrf);
}

// 单飞：并发请求共享同一次续期，避免同时打多个 refresh
let refreshInFlight: Promise<boolean> | null = null;

/** cookie 模式的刷新响应可能不带 expiresIn，兜底 300s */
function expiresInSeconds(payload: { expiresIn?: number; tokenType?: string; accessToken?: string }): number {
  return typeof payload.expiresIn === 'number' && payload.expiresIn > 0 ? payload.expiresIn : 300;
}

/** @returns 是否续期成功 */
async function runRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  // cookie 模式下 js 读不到 httpOnly refresh，只能靠「曾成功登录」留下的 expiresAt 判断有无凭据
  const hasCredential = tokenStorage.mode === 'local' ? Boolean(tokenStorage.getRefreshToken()) : !tokenStorage.isExpired();
  if (!hasCredential) return false;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(buildUrl('/api/v1/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', [CSRF_HEADER]: readCsrfFromCookie() ?? '' },
        body: JSON.stringify({}),
      });
      if (!res.ok) return false;
      const payload = (await res.json()) as ApiResponse<{ accessToken?: string; expiresIn?: number }>;
      if (!isSuccess(payload)) return false;

      // cookie 模式浏览器已自行换掉 cookie，只记新的到期时间；local 模式要把响应体里的 token 落盘
      tokenStorage.setTokens({
        accessToken: payload.data.accessToken ?? '',
        expiresIn: expiresInSeconds(payload.data),
      });
      return true;
    } catch {
      return false;
    } finally {
      // 置空后下一轮请求才能重新发起续期
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/** 会话彻底失效：清本地态并广播，AuthProvider 监听后跳登录 */
function emitSessionExpired(reason: string): void {
  tokenStorage.clear();
  tokenStorage.setCachedUser(null);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('decamore:auth-expired', { detail: { reason } }));
  }
}

async function rawFetch<T>(path: string, options: RequestOptions, isRetry = false): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  withAuthHeaders(headers, options.anonymous);

  let body: BodyInit | undefined;
  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.json);
  }

  const url = buildUrl(path, options.query);
  const method = (options.method ?? 'GET').toUpperCase();
  const timeoutMs = options.timeoutMs ?? 15_000;

  // 外部取消与超时都收敛到同一个 controller
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      method,
      headers,
      body,
      signal: controller.signal,
      // cookie 鉴权模式必须携带凭据
      credentials: options.credentials ?? 'include',
    });
  } catch (err: unknown) {
    clearTimeout(timer);
    const aborted = err instanceof DOMException && err.name === 'TimeoutError';
    throw new RequestError({
      status: 0,
      code: 'NETWORK',
      message: aborted ? '请求超时，请检查网络后重试' : '网络连接失败，请检查网络后重试',
      url,
      cause: err,
    });
  }
  clearTimeout(timer);

  // 401 只续期并重放一次，isRetry 挡住无限循环
  if (response.status === 401 && !options.skipAuthRefresh && !isRetry) {
    const refreshed = await runRefresh();
    if (refreshed) return rawFetch<T>(path, options, true);
    emitSessionExpired('refresh_failed');
  }

  // 204 按定义没有响应体，删除类接口成功就是空；走到下面会被当成「响应解析失败」
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: ApiResponse<T> | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as ApiResponse<T>;
    } catch {
      payload = null;
    }
  }

  if (!payload) {
    throw new RequestError({
      status: response.status,
      code: response.status >= 500 ? 'SERVER' : 'UNPARSEABLE',
      message: response.status >= 500 ? '服务异常，请稍后重试' : `响应解析失败（HTTP ${response.status}）`,
      url,
    });
  }

  const traceId = response.headers.get('x-trace-id') ?? payload.meta?.traceId;

  // 公开信封没有 success 字段，改按 statusCode 判定
  if (options.envelope === 'public') {
    const body = payload as unknown as PublicApiEnvelope<T>;
    if (!response.ok || body.statusCode !== ERROR_CODE.OK) {
      throw new RequestError({
        status: response.status,
        code: body.statusCode || response.status,
        message: body.message || `请求失败（HTTP ${response.status}）`,
        traceId,
        url,
      });
    }
    return body.data as T;
  }

  if (!response.ok || !isSuccess(payload)) {
    // issues / description 透传下去，表单要用来定位字段
    throw new RequestError({
      status: response.status,
      code: payload.success ? response.status : payload.statusCode,
      message: payload.message,
      ...(payload.success ? {} : { description: payload.description, issues: payload.issues }),
      traceId,
      url,
    });
  }

  return payload.data as T;
}

function shouldRetry(method: string, error: unknown, attemptsLeft: number): boolean {
  if (attemptsLeft <= 0) return false;
  if (!['GET', 'HEAD'].includes(method)) return false;
  return error instanceof RequestError && error.code === 'NETWORK';
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  let attemptsLeft = options.retry ?? (method === 'GET' ? 1 : 0);

  for (;;) {
    try {
      return await rawFetch<T>(path, options);
    } catch (error: unknown) {
      if (shouldRetry(method, error, attemptsLeft)) {
        attemptsLeft -= 1;
        // 退避 300ms，避免瞬时抖动连续打爆
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }
      throw error;
    }
  }
}

export const http = {
  get: <T>(path: string, params?: RequestOptions) => request<T>(path, { ...params, method: 'GET' }),
  post: <T, B = unknown>(path: string, json?: B, params?: Omit<RequestOptions, 'json'>) =>
    request<T>(path, { ...params, method: 'POST', json }),
  patch: <T, B = unknown>(path: string, json?: B, params?: Omit<RequestOptions, 'json'>) =>
    request<T>(path, { ...params, method: 'PATCH', json }),
  delete: <T>(path: string, params?: RequestOptions) => request<T>(path, { ...params, method: 'DELETE' }),
};

export { COOKIES, ERROR_CODE };
export { RequestError };

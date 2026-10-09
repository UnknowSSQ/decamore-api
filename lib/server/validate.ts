/** body / query / params 三种入参统一校验：失败抛 ValidationError 走 422，返回 transform 后的输出 */
import { type ZodTypeAny, type TypeOf } from 'zod';

import { toFieldIssues } from '@/lib/zod/validate-shared';
import { MAX_BODY_BYTES } from '@/lib/zod/common';
import { ValidationError } from './errors';

export { toFieldIssues, validateSoft, issueMapOf } from '@/lib/zod/validate-shared';

/** message 只取第一个 issue，明细留在 issues 数组 */
function throwInvalid(error: Parameters<typeof toFieldIssues>[0]): never {
  const issues = toFieldIssues(error);
  throw new ValidationError(issues, issues[0]?.message ?? '请求参数校验失败');
}

/** 先按体积上限拦大包；空 body 视为 {}，PATCH 类接口常不带 body */
export async function parseBody<S extends ZodTypeAny>(
  request: Request,
  schema: S,
  options?: { maxBytes?: number },
): Promise<TypeOf<S>> {
  const maxBytes = options?.maxBytes ?? MAX_BODY_BYTES;
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ValidationError([{ field: '(body)', message: `请求体过大（上限 ${Math.round(maxBytes / 1024)}KB）`, code: 'too_big' }]);
  }

  let raw: unknown = {};
  const text = await request.text();
  // 分块传输可以不带头，声明值不可信，读完再按真实长度兜一次
  if (new TextEncoder().encode(text).length > maxBytes) {
    throw new ValidationError([{ field: '(body)', message: `请求体过大（上限 ${Math.round(maxBytes / 1024)}KB）`, code: 'too_big' }]);
  }
  if (text.trim().length > 0) {
    try {
      raw = JSON.parse(text);
    } catch {
      throw new ValidationError([{ field: '(body)', message: '请求体不是合法 JSON', code: 'invalid_type' }], '请求体解析失败');
    }
  }

  const result = schema.safeParse(raw);
  if (!result.success) throwInvalid(result.error);
  return result.data as TypeOf<S>;
}

/** 同名多值会展开成数组 */
export function parseQuery<S extends ZodTypeAny>(url: URL, schema: S): TypeOf<S> {
  const source: Record<string, string | string[]> = {};
  url.searchParams.forEach((value, key) => {
    const existing = source[key];
    if (existing === undefined) source[key] = value;
    else source[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
  });

  const result = schema.safeParse(source);
  if (!result.success) throwInvalid(result.error);
  return result.data as TypeOf<S>;
}

/** Next 15 里 params 是 Promise */
export async function parseParams<S extends ZodTypeAny>(
  params: Record<string, string | string[]> | Promise<Record<string, string | string[]>>,
  schema: S,
): Promise<TypeOf<S>> {
  const resolved = await Promise.resolve(params);
  const result = schema.safeParse(resolved);
  if (!result.success) throwInvalid(result.error);
  return result.data as TypeOf<S>;
}

/** 本文件不带 server-only：validate-shared 是纯函数，客户端从任一路径引都可行 */

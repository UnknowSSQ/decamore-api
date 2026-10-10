/** 放这里而不是 lib/server，客户端表单才能安全 import，不会把 server-only 模块带进 bundle */
import { z, type ZodError } from 'zod';

import type { FieldIssue } from '@/types';

/** 展平为 FieldIssue[]，field 用点路径加数组下标；只取前 20 条 */
export function toFieldIssues(error: ZodError): FieldIssue[] {
  return error.issues.slice(0, 20).map((issue) => ({
    field: issue.path.length ? issue.path.map(String).join('.') : '(root)',
    message: issue.message,
    code: mapCode(issue.code),
  }));
}

function mapCode(code: z.ZodIssueCode): FieldIssue['code'] {
  switch (code) {
    case z.ZodIssueCode.too_small:
      return 'too_small';
    case z.ZodIssueCode.too_big:
      return 'too_big';
    case z.ZodIssueCode.invalid_string:
      return 'invalid_format';
    case z.ZodIssueCode.unrecognized_keys:
      return 'unrecognized_keys';
    case z.ZodIssueCode.custom:
      return 'custom';
    case z.ZodIssueCode.invalid_type:
    default:
      return 'invalid_type';
  }
}

/** 客户端软校验：不抛异常只返回结果，与后端共用同一份 schema */
export function validateSoft<S extends z.ZodTypeAny>(
  schema: S,
  data: unknown,
): { ok: true; value: z.TypeOf<S> } | { ok: false; issues: FieldIssue[] } {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, value: result.data as z.TypeOf<S> };
  return { ok: false, issues: toFieldIssues(result.error) };
}

/** 字段 → 首条错误文案，表单上一个字段只有一个错误位 */
export function toFirstIssueMap(issues: FieldIssue[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of issues) map[issue.field] ??= issue.message;
  return map;
}

/** 后端所有 API Route 返回 ApiResponse<T>，前端请求封装据此判断成败并映射可读文案 */

/** HTTP 语义之外的业务状态码，与前端文案表一一对应；只登记代码里真的会发出的码 */
export const ERROR_CODE = {
  OK: 200,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

/** 成功 / 失败两类信封共用 */
export interface ResponseMeta {
  /** 毫秒时间戳，供前端做时序判断 */
  timestamp: number;
  /** 与响应头 x-trace-id、调用统计中的 traceId 同值 */
  traceId: string;
}

export interface ApiSuccess<T> {
  statusCode: typeof ERROR_CODE.OK;
  success: true;
  message: string;
  data: T;
  meta: ResponseMeta;
}

/** Zod 校验失败的结构化字段错误 */
export interface FieldIssue {
  /** JSON Path 风格字段名，例如 "password" 或 "rules[0].limit" */
  field: string;
  message: string;
  code: 'invalid_type' | 'too_small' | 'too_big' | 'invalid_format' | 'custom' | 'unrecognized_keys';
}

export interface ApiFailure {
  statusCode: ErrorCode;
  success: false;
  message: string;
  /** 可直接展示给用户 */
  description?: string;
  /** 表单据此定位到具体输入框 */
  issues?: FieldIssue[];
  data: null;
  meta: ResponseMeta;
  /** 仅开发环境回传堆栈摘要 */
  debug?: { stack?: string; cause?: string };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function isSuccess<T>(res: ApiResponse<T>): res is ApiSuccess<T> {
  return res.success === true;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  /** 服务端算好，前端不必再乘 pageSize */
  hasMore: boolean;
}

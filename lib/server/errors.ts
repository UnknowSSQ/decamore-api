/** 业务异常统一抛 ApiError 及子类，由 withApiHandler 兜成标准响应，route 内不写 try/catch */
import { ERROR_CODE, type ErrorCode, type FieldIssue } from '@/types';

export class ApiError extends Error {
  /** 与响应体 statusCode 同值 */
  readonly status: number;
  readonly code: ErrorCode;
  /** 面向用户的简述，细节走 description */
  override readonly message: string;
  readonly description?: string;
  readonly issues?: FieldIssue[];
  /** 附加响应头，如 401 的 WWW-Authenticate、限流的 Retry-After */
  readonly headers?: Record<string, string>;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    options?: { description?: string; issues?: FieldIssue[]; headers?: Record<string, string> },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.message = message;
    this.description = options?.description;
    this.issues = options?.issues;
    this.headers = options?.headers;
    // 保证子类的 instanceof 在转译后仍成立
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = '请先登录', description?: string) {
    super(401, ERROR_CODE.UNAUTHORIZED, message, { description });
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = '权限不足，无法访问该资源', description?: string) {
    super(403, ERROR_CODE.FORBIDDEN, message, { description });
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message = '资源不存在') {
    super(404, ERROR_CODE.NOT_FOUND, message);
    this.name = 'NotFoundError';
  }
}

/** 由 validate() 在校验失败时抛出 */
export class ValidationError extends ApiError {
  constructor(issues: FieldIssue[], message = '请求参数校验失败') {
    super(422, ERROR_CODE.VALIDATION_FAILED, message, {
      description: issues[0] ? `${issues[0].field}：${issues[0].message}` : undefined,
      issues,
    });
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfterSec: number, reason?: string) {
    super(429, ERROR_CODE.TOO_MANY_REQUESTS, '请求过于频繁', {
      description: `请在 ${retryAfterSec} 秒后重试${reason ? `（${reason}）` : ''}`,
      headers: { 'Retry-After': String(retryAfterSec) },
    });
    this.name = 'RateLimitError';
  }
}

/** withApiHandler 对非 ApiError 异常的兜底 */
export class InternalError extends ApiError {
  constructor(message = '服务器内部错误', description?: string) {
    super(500, ERROR_CODE.INTERNAL_ERROR, message, { description });
    this.name = 'InternalError';
  }
}

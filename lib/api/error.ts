/**
 * 组件层只需 catch 这一种错误：code 为 'NETWORK' 表示网络层失败 / 超时拿不到响应，
 * 'UNPARSEABLE' 表示响应不是合法 JSON（如网关异常页），其余数字即后端 ApiResponse.statusCode。
 */
import type { ErrorCode, FieldIssue } from '@/types';

type RequestErrorCode = ErrorCode | number | 'NETWORK' | 'UNPARSEABLE' | 'SERVER';

interface RequestErrorInit {
  /** 网络失败时为 0 */
  status: number;
  code: RequestErrorCode;
  /** 可直接 toast 给用户 */
  message: string;
  description?: string;
  issues?: FieldIssue[];
  traceId?: string;
  url?: string;
  cause?: unknown;
}

export class RequestError extends Error {
  readonly status: number;
  readonly code: RequestErrorCode;
  readonly description?: string;
  readonly issues?: FieldIssue[];
  readonly traceId?: string;
  readonly url?: string;
  override readonly cause?: unknown;

  constructor(init: RequestErrorInit) {
    super(init.message);
    this.name = 'RequestError';
    this.status = init.status;
    this.code = init.code;
    this.message = init.message;
    this.description = init.description;
    this.issues = init.issues;
    this.traceId = init.traceId;
    this.url = init.url;
    this.cause = init.cause;
    Object.setPrototypeOf(this, RequestError.prototype);
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.code === 401;
  }
}

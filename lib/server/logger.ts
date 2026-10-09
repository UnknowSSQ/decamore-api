/** 结构化日志：每条压成单行 JSON，便于日志系统按行解析 */
import 'server-only';

import { getServerEnv } from '@/env';
import { getRequestContext } from './trace';

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_WEIGHT: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface LogFields {
  /** 事件名，用于检索，例如 api.request / auth.login */
  event: string;
  message?: string;
  meta?: Record<string, unknown>;
  error?: unknown;
}

function sink(level: Level, payload: Record<string, unknown>): void {
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

function write(level: Level, fields: LogFields): void {
  const env = getServerEnv();
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[env.LOG_LEVEL]) return;

  const ctx = getRequestContext();
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    event: fields.event,
    ...(fields.message ? { message: fields.message } : {}),
    ...(ctx
      ? {
          traceId: ctx.traceId,
          method: ctx.method,
          path: ctx.path,
          route: ctx.routePattern ?? ctx.path,
          status: ctx.status,
          userId: ctx.userId,
          ip: ctx.ip,
          durationMs: ctx.startedAt ? Math.round(performance.now() - ctx.startedAt) : undefined,
        }
      : {}),
    ...(fields.meta ?? {}),
    ...(fields.error
      ? {
          errorName: (fields.error as Error)?.name,
          errorMessage: (fields.error as Error)?.message,
          ...stackField(level, fields.error, env.NODE_ENV),
        }
      : {}),
  };

  sink(level, payload);
}

/** 只有非生产的 error 级才带堆栈；4xx 属按设计被拒绝，塞 stack 会淹没终端 */
function stackField(
  level: Level,
  error: unknown,
  nodeEnv: string | undefined,
): { stack?: string } {
  if (level !== 'error' || nodeEnv === 'production') return {};
  const stack = (error as Error)?.stack;
  if (!stack) return {};
  const frames = stack.split('\n');
  return { stack: frames.slice(0, 9).join('\n') };
}

export const logger = {
  debug: (fields: LogFields) => write('debug', fields),
  info: (fields: LogFields) => write('info', fields),
  warn: (fields: LogFields) => write('warn', fields),
  error: (fields: LogFields) => write('error', fields),
};

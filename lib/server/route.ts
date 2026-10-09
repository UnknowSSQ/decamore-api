/** 把 withApiHandler 的 unknown query/body 接上 Zod 推导类型，业务侧免写断言 */
import type { NextRequest, NextResponse } from 'next/server';
import type { ZodTypeAny } from 'zod';

import { withApiHandler, type ApiContext, type WithApiOptions } from './handler';

/** 直接读 _output 而不是 z.infer：后者在「泛型默认值 + 交叉类型」下会撞 deepPartial 自引用，每个 route 都报 TS2322 */
type Unwrap<S> = S extends { readonly _output: infer T } ? T : undefined;

export type RouteContext<TQuery, TBody, TExtra> = {
  /** 已按 schema 校验并转换；未配 schema 时为 undefined，body 同理 */
  query: TQuery;
  body: TBody;
  /** 始终是字符串字典，要类型化请走 config.params */
  params: Record<string, string>;
  /** config.auth === false 时为 null */
  session: ApiContext<TExtra>['session'];
  traceId: string;
  extra: TExtra;
};

/** Omit 掉 query/body 再声明为泛型槽位，避免重新落入 ZodTypeAny 交叉 */
export type RouteConfig<TQuerySchema, TBodySchema, TExtra> = Omit<
  WithApiOptions<TExtra>,
  'query' | 'body'
> & {
  query?: TQuerySchema;
  body?: TBodySchema;
};

/** 返回值签名与 App Router 的 (request, { params }) 兼容 */
export function defineRoute<
  TQuerySchema extends ZodTypeAny | undefined = undefined,
  TBodySchema extends ZodTypeAny | undefined = undefined,
  TExtra = Record<string, never>,
>(
  config: RouteConfig<TQuerySchema, TBodySchema, TExtra>,
  handler: (
    request: NextRequest,
    context: RouteContext<Unwrap<TQuerySchema>, Unwrap<TBodySchema>, TExtra>,
  ) => Promise<NextResponse> | NextResponse,
) {
  return withApiHandler<TExtra>(
    // safeParse + transform 已在 withApiHandler 内做完，这里只把 unknown 收窄成 schema 输出类型
    (request, ctx) =>
      handler(request, {
        query: ctx.query as Unwrap<TQuerySchema>,
        body: ctx.body as Unwrap<TBodySchema>,
        params: ctx.params,
        session: ctx.session,
        traceId: ctx.traceId,
        extra: ctx.extra,
      }),
    config,
  );
}

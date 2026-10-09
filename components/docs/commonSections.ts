/** 十个接口文档共用的响应头段：这些头由 withApiHandler 与中间件统一产出，逐接口写的只会漂 */
import type { DocSection, InlineFragment } from './types';

export interface HeadersSectionOptions {
  /** 本接口的缓存语义，写进 Cache-Control 那一行 */
  cache: InlineFragment[];
  /** 示例请求 ID，取该接口实测响应里的值 */
  traceId: string;
}

const CODE = (value: string): InlineFragment => ({ type: 'code', value });
const TXT = (value: string): InlineFragment => ({ type: 'text', value });

export function headersSection({ cache, traceId }: HeadersSectionOptions): DocSection {
  return {
    id: 'headers',
    title: '响应头',
    content: [
      {
        kind: 'table',
        variant: 'headers',
        rows: [
          {
            name: 'Content-Type',
            example: 'application/json; charset=utf-8',
            description: [TXT('固定为 JSON。不支持 JSONP，没有 text/javascript 分支。')],
          },
          {
            name: 'Cache-Control',
            example: 'no-store, max-age=0',
            description: cache,
          },
          {
            name: 'x-trace-id',
            example: traceId,
            description: [TXT('与 '), CODE('requestId'), TXT(' 同值，用于日志检索。')],
          },
          {
            name: 'x-request-id',
            example: traceId,
            description: [TXT('由中间件生成的请求 ID，缺失时服务端另行生成。')],
          },
          {
            name: 'Retry-After',
            example: '38',
            description: [TXT('仅在 '), CODE('429'), TXT(' 时出现，单位秒。')],
          },
          {
            name: 'Access-Control-Allow-Origin',
            example: '（按需下发）',
            description: [
              TXT(
                '请求带 Origin 且该来源在后台「安全设置 · CORS」里时才会输出，同时附 Vary: Origin。不下发 Allow-Credentials，跨源只能调免鉴权的公开接口。',
              ),
            ],
          },
          {
            name: 'X-Cache / X-RateLimit-*',
            example: '（未下发）',
            description: [TXT('缓存命中与配额计数响应头尚未实现，请勿依赖。')],
          },
        ],
      },
    ],
  };
}

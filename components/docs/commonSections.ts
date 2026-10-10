/** 十个接口文档共用的响应头段与请求方式表：这些内容由 withApiHandler 与中间件统一产出，逐接口写的只会漂 */
import { text } from './fragments';
import type { DocSection, InlineFragment, LimitRow } from './types';

export interface HeadersSectionOptions {
  /** 本接口的缓存语义，写进 Cache-Control 那一行 */
  cache: InlineFragment[];
  /** Cache-Control 的示例值；放开缓存的接口必须与响应头实际下发的一致 */
  cacheExample?: string;
  /** 示例请求 ID，取该接口实测响应里的值 */
  traceId: string;
}

const CODE = (value: string): InlineFragment => ({ type: 'code', value });
const TXT = (value: string): InlineFragment => ({ type: 'text', value });

export function headersSection({ cache, cacheExample, traceId }: HeadersSectionOptions): DocSection {
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
            example: cacheExample ?? 'no-store, max-age=0',
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

export interface RequestSectionOptions {
  /** 站内路径，写进「站内路径」那一行 */
  path: string;
  /** 少数接口在表格前有一句导语 */
  lead?: DocSection['content'][number];
}

/** 请求方式表：五行里只有站内路径随接口变化，其余四个接口类型（鉴权 / Content-Type / 协议）都一样 */
export function requestSection({ path, lead }: RequestSectionOptions): DocSection {
  return {
    id: 'request',
    title: '请求方式',
    content: [
      ...(lead ? [lead] : []),
      {
        kind: 'table',
        variant: 'request',
        rows: [
          {
            item: '请求方法',
            value: 'GET',
            description: [
              TXT('其他方法由框架直接返回 '),
              CODE('405'),
              TXT('（无响应体，不经过业务信封）'),
            ],
          },
          { item: '站内路径', value: path, description: text('同源页面可直接相对路径调用') },
          { item: '协议', value: 'HTTP / HTTPS', description: text('/') },
          { item: '鉴权', value: '无需', description: text('匿名可调用，按 IP 限频') },
          { item: 'Content-Type', value: '—', description: text('无请求体，无需设置') },
        ],
      },
    ],
  };
}

/** 全局限频行：阈值取自环境变量，十个接口逐字相同，重写一遍只会和实现脱节 */
export const RATE_LIMIT_ROW: LimitRow = {
  item: '调用频率',
  limit: '120 次 / 分钟 / IP',
  description: [
    TXT('按「IP + 方法 + 路径」固定窗口计数（窗口 60 秒），阈值取自环境变量 '),
    CODE('RATE_LIMIT_PER_MIN'),
    TXT('，默认 120；超限返回 '),
    CODE('429'),
    TXT(' 与 Retry-After 头。'),
  ],
};

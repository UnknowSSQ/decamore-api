/** 接口文档内容；字段行为与数字均为 2026-10-08 实测 */
import { frag, para, text } from '../fragments';
import { apiUrl } from '../url';
import type { ApiDoc, CodePaneData, DocSection } from '../types';

const path = '/api/v1/hitokoto';
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(
        ...text('动漫也好、小说也好、网络也好，不论在哪里，我们总会看到有那么一两个句子能穿透你的心。'),
      ),
      para(
        ...frag`对外接口返回单层信封 ${'{ statusCode, message, data, meta }'}：${'data'} 即业务数据，${'meta'} 收敛调用元信息（${'requestId'} / ${'serverTime'} / ${'site'}）。其中 ${'requestId'} 与响应头 ${'x-trace-id'} 同值，反馈问题时提供它即可定位到服务端日志。`,
      ),
    ],
  },
  {
    id: 'request',
    title: '请求方式',
    content: [
      para(
        ...frag` ${'GET'} 请求，无请求参数、无请求体、无需鉴权。字符编码统一为 UTF-8，响应为 ${'application/json; charset=utf-8'}。`,
      ),
      {
        kind: 'table',
        variant: 'request',
        rows: [
          { name: '请求方法', type: 'GET', description: [
            { type: 'text', value: '其他方法由框架直接返回 ' },
            { type: 'code', value: '405' },
            { type: 'text', value: '（无响应体，不经过业务信封）' },
          ]},
          { name: '站内路径', type: '/api/v1/hitokoto', description: text('同源页面可直接相对路径调用') },
          { name: '协议', type: 'HTTP / HTTPS', description: text('/') },
          { name: '鉴权', type: '无需', description: text('匿名可调用，按 IP 限频'), required: 'na' },
          { name: 'Content-Type', type: '—', description: text('无请求体，无需设置') },
        ],
      },
    ],
  },
  {
    id: 'params',
    title: '请求参数',
    content: [
      para(...text('')),
      {
        kind: 'table',
        variant: 'params',
        rows: [
          {
            name: '/',
            type: '/',
            required: 'na',
            defaultValue: '/',
            description: text('/'),
          },
        ],
      },
    ],
  },
  {
    id: 'response',
    title: '返回参数',
    content: [
      para(...text('响应体为 UTF-8 编码的统一 JSON 对象，单层信封，字段结构如下。')),
      {
        kind: 'table',
        variant: 'response',
        rows: [
          {
            name: 'statusCode',
            type: 'integer',
            description: [
              { type: 'text', value: '业务状态码，成功固定为 ' },
              { type: 'code', value: '200' },
              { type: 'text', value: '；失败响应结构见「错误码」。' },
            ],
          },
          { name: 'message', type: 'string', description: text('结果描述，成功时为 success。') },
          { name: 'data', type: 'object', description: text('一条短句对象，字段见下方子行。') },
          {
            name: 'content',
            type: 'string',
            description: [
              { type: 'text', value: '句子正文, 内容分类随机' },
            ],
            isChild: true,
          },
          { name: 'creator', 
            type: 'string', 
            description: text('作者或角色名。'), 
            isChild: true },
          {
            name: 'source',
            type: 'string',
            description: [
              { type: 'text', value: '出处（书名 / 篇名等）' },
            ],
            isChild: true,
          },
          { name: 'meta', type: 'object', description: text('调用元信息，用于日志检索与时序判断。') },
          {
            name: 'requestId',
            type: 'string',
            description: [
              { type: 'text', value: '请求追踪 ID，与响应头 ' },
              { type: 'code', value: 'x-trace-id' },
              { type: 'text', value: ' 同值，反馈问题时请一并提供。' },
            ],
            isChild: true,
          },
          {
            name: 'serverTime',
            type: 'string',
            description: [
              { type: 'text', value: '服务端生成响应的 ISO 8601 时间（UTC）' },
            ],
            isChild: true,
          },
          {
            name: 'site',
            type: 'string',
            description: text('站点名称'),
            isChild: true,
          },
        ],
      },
    ],
  },
  {
    id: 'headers',
    title: '响应头',
    content: [
      {
        kind: 'table',
        variant: 'headers',
        rows: [
          {
            name: 'Content-Type',
            type: '',
            example: 'application/json; charset=utf-8',
            description: text('固定为 JSON。当前不支持 JSONP，没有 text/javascript 分支。'),
          },
          {
            name: 'Cache-Control',
            type: '',
            example: 'no-store, max-age=0',
            description: text('随机接口默认不缓存；「同参数组合缓存 60 秒」为规划能力。'),
          },
          {
            name: 'x-trace-id',
            type: '',
            example: 'muy8epbv-1e4189a2',
            description: [
              { type: 'text', value: '与 ' },
              { type: 'code', value: 'requestId' },
              { type: 'text', value: ' 同值，用于日志检索。' },
            ],
          },
          {
            name: 'x-request-id',
            type: '',
            example: 'muy8epbv-1e4189a2',
            description: text('由边缘中间件生成的请求 ID，缺失时服务端另行生成。'),
          },
          {
            name: 'Retry-After',
            type: '',
            example: '38',
            description: [
              { type: 'text', value: '仅在 ' },
              { type: 'code', value: '429' },
              { type: 'text', value: ' 时出现，单位秒。' },
            ],
          },
          {
            name: 'Access-Control-Allow-Origin',
            type: '',
            example: '（未下发）',
            description: text('当前实现没有输出跨域头，浏览器跨源调用会被拦截；同域页面可直接 fetch。'),
          },
          {
            name: 'X-Cache / X-RateLimit-*',
            type: '',
            example: '（未下发）',
            description: text('缓存命中与配额计数响应头尚未实现，请勿依赖。'),
          },
        ],
      },
    ],
  },
  {
    id: 'errors',
    title: '错误码',
    content: [
      para(
        ...frag`失败响应使用控制台的错误信封 ${'{ statusCode, success:false, message, description?, data: null, meta:{ timestamp, traceId } }'}`,
      ),
      {
        kind: 'table',
        variant: 'errors',
        rows: [
          {
            http: '405',
            statusCode: '—',
            name: '方法不支持',
            type: '',
            description: text('由框架直接返回，响应体为空'),
            suggestion: text('使用 GET 请求。'),
          },
          {
            http: '429',
            statusCode: '429',
            name: '频率限制',
            type: '',
            description: [
              { type: 'text', value: 'message 为「请求过于频繁」，description 为「请在 N 秒后重试」，并带 ' },
              { type: 'code', value: 'Retry-After' },
              { type: 'text', value: ' 头。窗口固定 60 秒。' },
            ],
            suggestion: text('按 Retry-After 退避，并对结果做本地缓存。'),
          },
          {
            http: '500',
            statusCode: '500',
            name: '服务端内部错误',
            type: '',
            description: text('数据库异常'),
            suggestion: [
              { type: 'text', value: '重试 1 次；仍失败请携带 ' },
              { type: 'code', value: 'traceId' },
              { type: 'text', value: ' 反馈。' },
            ],
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '没有 400 / 404 / 422。',
        fragments: text('接口无参数，因此不存在取值非法、区间无解、校验失败这类分支；传入多余参数会被忽略。'),
      },
    ],
  },
  {
    id: 'limits',
    title: '速率与缓存',
    content: [
      {
        kind: 'table',
        variant: 'limits',
        rows: [
          {
            name: '调用频率',
            type: '120 次 / 分钟 / IP',
            description: [
              { type: 'text', value: '按「IP + 方法 + 路径」固定窗口计数（窗口 60 秒），阈值取自环境变量 ' },
              { type: 'code', value: 'RATE_LIMIT_PER_MIN' },
              { type: 'text', value: '，默认 120；超限返回 ' },
              { type: 'code', value: '429' },
              { type: 'text', value: ' 与 Retry-After 头。' },
            ],
          },
          {
            name: '并发建议',
            type: '≤ 2 QPS',
            description: text('批量场景请串行或合并请求，与默认阈值保持余量。'),
          },
          {
            name: '服务端缓存',
            type: '未实现',
            description: text('响应本身不缓存，Cache-Control 为 no-store，也不下发 X-Cache。'),
          },
          { name: '客户端建议', type: '≥ 30 s', description: text('避免高频抖动与重复请求。') },
          {
            name: '超时与重试',
            type: '建议 3 s / 1 次',
            description: [
              { type: 'text', value: '仅对 ' },
              { type: 'code', value: '5xx' },
              { type: 'text', value: ' 与网络错误重试，' },
              { type: 'code', value: '4xx' },
              { type: 'text', value: ' 不重试。' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'changelog',
    title: '更新日志',
    content: [
      {
        kind: 'table',
        variant: 'changelog',
        rows: [
          {
            name: '2026-10-07',
            type: 'v1.0',
            description: text('一言接口上线。'),
          },
        ],
      },
    ],
  },
];


const requestPanes: CodePaneData[] = [
  {
    value: 'curl',
    label: 'cURL',
    lang: 'bash',
    code: `# 无参数，直接 GET 即可
curl "${url}"`,
  },
  {
    value: 'js',
    label: 'JavaScript',
    lang: 'js',
    code: `const res = await fetch("${url}");
const { statusCode, message, data, meta } = await res.json();

if (statusCode === 200) {
  console.log(data.content, "—", data.creator, "·", data.source);
  console.log("requestId:", meta.requestId, "site:", meta.site);
} else {
  console.error(message);
}`,
  },
  {
    value: 'py',
    label: 'Python',
    lang: 'py',
    code: `import requests

body = requests.get("${url}").json()
data, meta = body["data"], body["meta"]
print(data["content"], "—", data["creator"], "·", data["source"], meta["requestId"])`,
  },
];

const responsePanes: CodePaneData[] = [
  {
    value: 'ok',
    label: '200 OK',
    lang: 'json',
    code: `{
  "statusCode": 200,
  "message": "success",
  "data": {
    "content": "最是人间留不住,朱颜辞镜花辞树",
    "creator": "王国维",
    "source": "蝶恋花"
  },
  "meta": {
    "requestId": "muy8epbv-1e4189a2",
    "serverTime": "2026-10-07T14:57:33.433Z",
    "site": "Decamore API"
  }
}`,
  },
  {
    value: 'limit',
    label: '429',
    lang: 'json',
    code: `{
  "statusCode": 429,
  "success": false,
  "message": "请求过于频繁",
  "description": "请在 16 秒后重试",
  "data": null,
  "meta": {
    "timestamp": 1791384064645,
    "traceId": "muy8epbv-1e4189a2"
  }
}

// 同时带响应头 Retry-After: 16`,
  },
];

export const hitokotoDoc: ApiDoc = {
  slug: 'hitokoto',
  name: '一言',
  en: 'Hitokoto',
  category: '内容',
  method: 'GET',
  path,
  implemented: true,
  documented: true,
  eyebrow: 'Content API · v1',
  lede: '动漫也好、小说也好、网络也好，不论在哪里，我们总会看到有那么一两个句子能穿透你的心。',
  facts: ['限频 120 次 / 分钟 / IP'],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-07' },
    { label: '服务可用性', value: '99.9%' },
    { label: '平均响应', value: '< 80ms' },
    { label: '限频', value: '120 次 / 分钟 / IP' },
  ],
  sections,
  requestPanes,
  responsePanes,
};


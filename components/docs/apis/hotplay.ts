/** 接口文档内容；字段行为与数字均为 2026-10-08 实测 */
import { frag, para, text } from '../fragments';
import { apiUrl } from '../url';
import type { ApiDoc, CodePaneData, DocSection } from '../types';

const path = '/api/v1/hotplay';
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(...text('大屏播出榜：电视剧、电影、综艺三张榜，顺带给出每部剧在哪些平台的 TV 端播。')),
      para(
        ...frag`对外接口返回单层信封 ${'{ statusCode, message, data, meta }'}：${'data'} 是一份榜单，${'meta'} 收敛调用元信息（${'requestId'} / ${'serverTime'} / ${'site'}）。其中 ${'requestId'} 与响应头 ${'x-trace-id'} 同值，反馈问题时提供它即可定位到服务端日志。`,
      ),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '这是大屏播出榜，不是网络热度榜。',
        fragments: text('heat 与 score 是欢网自己的指数，不是视频网站的播放量，也别拿去和热搜、热歌的数字比大小。'),
      },
    ],
  },
  {
    id: 'request',
    title: '请求方式',
    content: [
      {
        kind: 'table',
        variant: 'request',
        rows: [
          { name: '请求方法', type: 'GET', description: [
            { type: 'text', value: '其他方法由框架直接返回 ' },
            { type: 'code', value: '405' },
            { type: 'text', value: '（无响应体，不经过业务信封）' },
          ]},
          { name: '站内路径', type: '/api/v1/hotplay', description: text('同源页面可直接相对路径调用') },
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
      {
        kind: 'table',
        variant: 'params',
        rows: [
          {
            name: 'type',
            type: 'tv / movie / variety',
            required: 'no',
            defaultValue: 'tv',
            description: [
              { type: 'code', value: '?type=' },
              { type: 'text', value: '留空或不传时给电视剧榜；' },
            ],
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'warn',
        mark: '!',
        strong: '这里没有纪录片榜、也没有动漫榜。',
        fragments: text('上游只有 1（电视剧）、2（综艺）、3（电影）三类有数据，?type=anime 直接返回 422。'),
      },
    ],
  },
  {
    id: 'response',
    title: '返回参数',
    content: [
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
          { name: 'data', type: 'object', description: text('这一类的榜单。') },
          {
            name: 'type',
            type: 'string',
            description: text('这份数据实际是哪一类；你没传时这里是 tv。'),
            isChild: true,
          },
          {
            name: 'boardDate',
            type: 'string',
            description: text('榜单归属日期（YYYY-MM-DD）。上游出榜滞后，2026-10-08 实测拿到的是 2026-10-06。'),
            isChild: true,
          },
          {
            name: 'updatedAt',
            type: 'string',
            description: text('由 boardDate 换算的 ISO 8601 时间（UTC）。上游只给到日期，所以它恒在整天边界上。'),
            isChild: true,
          },
          {
            name: 'cached',
            type: 'boolean',
            description: text('命中 10 分钟缓存时为 true'),
            isChild: true,
          },
          { name: 'items', type: 'array', description: text('榜单条目，每张榜 20 条'), isChild: true },
          { name: 'rank', type: 'integer', description: text('排名'), isChild: true },
          { name: 'title', type: 'string', description: text('剧名 / 片名 / 节目名原文'), isChild: true },
          { name: 'category', type: 'string | null', description: text('内容类别原文'), isChild: true },
          { name: 'heat', type: 'integer | null', description: text('大屏播放指数，榜单按它排'), isChild: true },
          { name: 'score', type: 'integer | null', description: text('综合评分指数，上游只在部分条目给，缺省为 null'), isChild: true },
          {
            name: 'platforms',
            type: 'string[]',
            description: text('播出平台原名，可能多个：云视听极光、银河奇异果、CIBN酷喵影视、芒果TV'),
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
            description: [{ type: 'text', value: '服务端生成响应的 ISO 8601 时间（UTC）' }],
            isChild: true,
          },
          { name: 'site', type: 'string', description: text('站点名称'), isChild: true },
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '没有 url 字段。',
        fragments: text('上游榜单数据里不含落地页链接，也不拿平台名去拼一个看着能点的地址。'),
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
            description: text('固定为 JSON，不支持 JSONP。'),
          },
          {
            name: 'Cache-Control',
            type: '',
            example: 'no-store, max-age=0',
            description: text('接口响应不缓存'),
          },
          {
            name: 'x-trace-id',
            type: '',
            example: 'muzi2zsp-516ebcc8',
            description: [
              { type: 'text', value: '与 ' },
              { type: 'code', value: 'requestId' },
              { type: 'text', value: ' 同值，用于日志检索。' },
            ],
          },
          {
            name: 'x-request-id',
            type: '',
            example: 'muzi2zsp-516ebcc8',
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
            description: text('缓存命中看响应里的 cached 字段，剩余配额的计数头还没实现。'),
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
            http: '422',
            statusCode: '422',
            name: '参数不合法',
            type: '',
            description: [
              { type: 'text', value: 'message 为「type 只能是 tv、movie 或 variety」，并带 ' },
              { type: 'code', value: 'issues' },
              { type: 'text', value: ' 指明是 type 字段。' },
            ],
            suggestion: text('把取值收敛到这三类；想省事就一个都不传，走电视剧榜。'),
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
            suggestion: text('榜面一天才更新一次，轮询再快也不会更早看到新剧。'),
          },
          {
            http: '503',
            statusCode: '503',
            name: '上游取不到',
            type: '',
            description: text('message 形如「电视剧热播榜暂时取不到」，description 会带上失败原因'),
            suggestion: text('换一类或稍后再试；一直不行的话，带着 traceId 来找我们。'),
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '不会返回空列表。',
        fragments: text('取不到可用条目时直接 503，而不是给你一个 items: [] 让你自己猜原因。'),
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
              { type: 'text', value: ' 与 Retry-After 头。三类榜共用同一份配额。' },
            ],
          },
          {
            name: '榜单缓存',
            type: '10 分钟 / 每类型',
            description: text('三张榜各存一份，命中时 cached=true；'),
          },
          {
            name: '缓存实现',
            type: '进程内存',
            description: text('单进程内存表'),
          },
          {
            name: '外部依赖',
            type: '欢网大数据',
            description: text('需要带它站内的 referer；实测免 cookie、免签名，但不属于公开文档接口，改版会直接体现为 503。'),
          },
          {
            name: '回退策略',
            type: '当天 → last_time',
            description: text('当天没出榜就顺着上游给的 last_time 再取一次，boardDate 是最终命中的那个日期。'),
          },
          {
            name: '并发建议',
            type: '≤ 2 QPS',
            description: text('不建议'),
          },
          {
            name: '客户端建议',
            type: '轮询 ≥ 10 min',
            description: text('比缓存周期更快的轮询拿到的还是同一份榜，只是白耗配额。'),
          },
          {
            name: '超时与重试',
            type: '建议 3 s / 1 次',
            description: [
              { type: 'text', value: '服务端等待上限是 8 秒；客户端只对 ' },
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
            name: '2026-10-08',
            type: 'v1.0',
            description: text('热播榜上线：电视剧 / 电影 / 综艺三类大屏播出榜，type 可选，服务端按类型缓存 10 分钟，带 last_time 回退。'),
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
    code: `# 不传 type：默认电视剧榜
curl "${url}"

# 指定类型
curl "${url}?type=tv"
curl "${url}?type=movie"
curl "${url}?type=variety"`,
  },
  {
    value: 'js',
    label: 'JavaScript',
    lang: 'js',
    code: `const res = await fetch("${url}?type=tv");
const { statusCode, message, data, meta } = await res.json();

if (statusCode === 200) {
  console.log(data.type, "榜 ·", data.boardDate, "cached:", data.cached);
  for (const item of data.items.slice(0, 5)) {
    console.log(item.rank, item.title, item.heat, item.score ?? "-", item.platforms.join("/"));
  }
  console.log("requestId:", meta.requestId);
} else {
  console.error(message);
}`,
  },
  {
    value: 'py',
    label: 'Python',
    lang: 'py',
    code: `import requests

body = requests.get("${url}", params={"type": "movie"}).json()
data = body["data"]
print(data["type"], data["boardDate"], "cached:", data["cached"])
for item in data["items"][:5]:
    print(item["rank"], item["title"], item["heat"], item["score"], "/".join(item["platforms"]))`,
  },
];

const responsePanes: CodePaneData[] = [
  {
    value: 'ok',
    label: '200 · tv',
    lang: 'json',
    code: `{
  "statusCode": 200,
  "message": "success",
  "data": {
    "type": "tv",
    "boardDate": "2026-10-06",
    "updatedAt": "2026-10-05T16:00:00.000Z",
    "cached": true,
    "items": [
      {
        "rank": 1,
        "title": "兰香如故",
        "category": "电视剧",
        "heat": 10410,
        "score": 96,
        "platforms": ["云视听极光"]
      },
      {
        "rank": 2,
        "title": "余红旧事",
        "category": "电视剧",
        "heat": 8541,
        "score": null,
        "platforms": ["银河奇异果"]
      }
      // … 共 20 条
    ]
  },
  "meta": {
    "requestId": "muzi2zsp-516ebcc8",
    "serverTime": "2026-10-08T12:16:09.165Z",
    "site": "Decamore API"
  }
}`,
  },
  {
    value: 'movie',
    label: '200 · movie',
    lang: 'json',
    code: `{
  "statusCode": 200,
  "message": "success",
  "data": {
    "type": "movie",
    "boardDate": "2026-10-06",
    "updatedAt": "2026-10-05T16:00:00.000Z",
    "cached": true,
    "items": [
      {
        "rank": 1,
        "title": "功夫女足",
        "category": "电影",
        "heat": 10223,
        "score": null,
        "platforms": ["银河奇异果", "芒果TV", "云视听极光", "CIBN酷喵影视"]
      }
      // … 共 20 条
    ]
  },
  "meta": {
    "requestId": "muzi2ztl-2709215f",
    "serverTime": "2026-10-08T12:16:09.188Z",
    "site": "Decamore API"
  }
}`,
  },
  {
    value: 'invalid',
    label: '422',
    lang: 'json',
    code: `{
  "statusCode": 422,
  "success": false,
  "message": "type 只能是 tv、movie 或 variety",
  "description": "type：type 只能是 tv、movie 或 variety",
  "issues": [
    { "field": "type", "message": "type 只能是 tv、movie 或 variety", "code": "invalid_type" }
  ],
  "data": null,
  "meta": {
    "timestamp": 1791461769208,
    "traceId": "muzi2zu3-c0b4ea22"
  }
}`,
  },
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const hotplayDoc: ApiDoc = {
  slug: 'hotplay',
  name: '热播榜',
  en: 'Hot Play',
  category: '内容',
  method: 'GET',
  path,
  implemented: true,
  documented: true,
  eyebrow: 'Content API · v1',
  lede: '剧集、电影、综艺在大屏上怎么播',
  facts: ['三类榜单，缺省电视剧', '服务端缓存 10 分钟'],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-08' },
    { label: '榜单类型', value: 'tv · movie · variety' },
    { label: '服务端缓存', value: '10 分钟 / 每类型' },
    { label: '限频', value: '120 次 / 分钟 / IP' },
  ],
  sections,
  requestPanes,
  responsePanes,
};

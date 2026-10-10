/** 接口文档内容；字段行为与数字均为 2026-10-08 实测 */
import { frag, para, text } from '../fragments';
import { apiUrl } from '../url';
import { RATE_LIMIT_ROW, headersSection, requestSection } from '../commonSections';
import type { AuthoredApiDoc, CodePaneData, DocSection } from '../types';

const path = '/api/v1/hotchart';
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(...text('院线此刻的实时票房榜：按当日票房从高到低排好的在映影片。')),
      para(
        ...frag`对外接口返回单层信封 ${'{ statusCode, message, data, meta }'}：${'data'} 是整份榜单，${'meta'} 收敛调用元信息（${'requestId'} / ${'serverTime'} / ${'site'}）。其中 ${'requestId'} 与响应头 ${'x-trace-id'} 同值，反馈问题时提供它即可定位到服务端日志。`,
      ),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '这是票房榜，没有评分。',
        fragments: text('上游这个接口只出票房与排片，不含猫眼评分。'),
      },
    ],
  },
  requestSection({ path }),
  {
    id: 'params',
    title: '请求参数',
    content: [
      para(...text('没有参数，空 GET 就是完整调用。')),
      {
        kind: 'table',
        variant: 'params',
        rows: [
          {
            name: '/',
            type: '/',
            defaultValue: '/',
            description: text('多余的查询串（比如 ?type=tv）不报错也不改变结果，直接忽略'),
          },
          {
            name: 'limit',
            type: 'integer',
            required: 'no',
            defaultValue: '不传为全量',
            description: [
              { type: 'text', value: '只给榜单' },
              { type: 'code', value: '前 N 条' },
              { type: 'text', value: '（榜单有序，截的是头部）；取值 1–100，超范围返回 422。' },
            ],
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'warn',
        mark: '!',
        strong: '这份榜不分剧集、综艺。',
        fragments: text('要按类别看大屏播出榜，走 /api/v1/hotplay。'),
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
          { name: 'data', type: 'object', description: text('整份榜单。') },
          {
            name: 'updateTime',
            type: 'string',
            description: text('榜单自身的更新时间（ISO 8601，UTC）。'),
            isChild: true,
          },
          {
            name: 'cached',
            type: 'boolean',
            description: text('命中 1 小时缓存时为 true'),
            isChild: true,
          },
          {
            name: 'items',
            type: 'array',
            description: text('在映影片，实测 63 条，已按当日票房排好'),
            isChild: true,
          },
          { name: 'rank', type: 'integer', description: text('排名'), isChild: true },
          { name: 'title', type: 'string', description: text('影片名'), isChild: true },
          { name: 'releaseInfo', type: 'string | null', description: text('上映状态原文，如「上映4天」'), isChild: true },
          {
            name: 'boxOffice',
            type: 'integer | null',
            description: text('当日实时票房（元），上游单位是分，已换算'),
            isChild: true,
          },
          { name: 'boxOfficeText', type: 'string | null', description: text('上游拼好的当日票房串，如「1533.38万」'), isChild: true },
          { name: 'boxRate', type: 'string | null', description: text('当日票房占比原文，如「37.3%」'), isChild: true },
          {
            name: 'totalBoxOffice',
            type: 'string | null',
            description: text('累计票房原文，如「1.89亿」——是给人看的字符串，不是数值'),
            isChild: true,
          },
          { name: 'showCount', type: 'integer | null', description: text('当日排片场次数'), isChild: true },
          { name: 'seatRate', type: 'string | null', description: text('上座率原文，如「2.6%」'), isChild: true },
          { name: 'viewPerShow', type: 'string | null', description: text('场均人次原文，如「3.9」'), isChild: true },
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
        fragments: text('影片页在对方自己的反爬里会反复重定向，与其给一个打不开的链接，不如不给。'),
      },
    ],
  },
  headersSection({
    cache: text('接口响应不缓存'),
    traceId: 'muzifpj8-9179c6b1',
  }),
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
            label: '方法不支持',
            description: text('由框架直接返回，响应体为空'),
            suggestion: text('使用 GET 请求。'),
          },
          {
            http: '429',
            statusCode: '429',
            label: '频率限制',
            description: [
              { type: 'text', value: 'message 为「请求过于频繁」，description 为「请在 N 秒后重试」，并带 ' },
              { type: 'code', value: 'Retry-After' },
              { type: 'text', value: ' 头。窗口固定 60 秒。' },
            ],
            suggestion: text('接口对外缓存 1 小时，更快的轮询拿到的还是同一份榜。'),
          },
          {
            http: '503',
            statusCode: '503',
            label: '上游取不到',
            description: text('message 为「热映榜暂时取不到」，description 会带上失败原因'),
            suggestion: text('稍后再试；一直不行的话，带着 traceId 来找我们。'),
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '没有 400 / 404 / 422。',
        fragments: text(
          '接口无参数，所以不存在取值非法、校验失败、查无此榜这些分支；取不到可用影片时直接 503。',
        ),
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
          RATE_LIMIT_ROW,
          {
            item: '榜单缓存',
            limit: '1 小时',
            description: text('命中时 cached=true；'),
          },
          {
            item: '缓存实现',
            limit: '进程内存',
            description: text('单进程内存表'),
          },
          {
            item: '外部依赖',
            limit: '猫眼专业版',
            description: text('必须带上它站内的 referer 与 x-requested-with，缺一个就被判 403；不属于公开文档接口，改版会直接体现为 503。'),
          },
          {
            item: '并发建议',
            limit: '≤ 2 QPS',
            description: text('不建议'),
          },
          {
            item: '客户端建议',
            limit: '轮询 ≥ 1 小时',
            description: text('接口对外缓存 1 小时，更快的轮询只会拿到同一份榜。'),
          },
          {
            item: '超时与重试',
            limit: '建议 3 s / 1 次',
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
            date: '2026-10-08',
            version: 'v1.0',
            description: text('热映榜上线：猫眼实时票房榜，无参数，服务端缓存 1 小时，返回影片名、当日票房与占比、累计票房、场次与上座率。'),
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
    code: `# 无参数，直接 GET
curl "${url}"`,
  },
  {
    value: 'js',
    label: 'JavaScript',
    lang: 'js',
    code: `const res = await fetch("${url}");
const { statusCode, message, data, meta } = await res.json();

if (statusCode === 200) {
  console.log(data.items.length + " 部在映 · 榜单时间", data.updateTime, "cached:", data.cached);
  for (const movie of data.items.slice(0, 5)) {
    console.log(movie.rank, movie.title, movie.boxOfficeText, movie.boxRate, movie.totalBoxOffice);
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

body = requests.get("${url}").json()
data = body["data"]
print(len(data["items"]), "部在映", data["updateTime"], "cached:", data["cached"])
for movie in data["items"][:5]:
    print(movie["rank"], movie["title"], movie["boxOfficeText"], movie["boxRate"], movie["totalBoxOffice"])`,
  },
];

const responsePanes: CodePaneData[] = [
  {
    value: 'ok',
    label: '200 · 回源',
    lang: 'json',
    code: `{
  "statusCode": 200,
  "message": "success",
  "data": {
    "updateTime": "2026-10-08T12:26:03.620Z",
    "cached": false,
    "items": [
      {
        "rank": 1,
        "title": "生化危机：爆发夜",
        "releaseInfo": "上映4天",
        "boxOffice": 15333803,
        "boxOfficeText": "1533.38万",
        "boxRate": "37.3%",
        "totalBoxOffice": "1.89亿",
        "showCount": 98544,
        "seatRate": "2.6%",
        "viewPerShow": "3.9"
      },
      {
        "rank": 2,
        "title": "神探之痕迹",
        "releaseInfo": "上映8天",
        "boxOffice": 11961509,
        "boxOfficeText": "1196.15万",
        "boxRate": "29.1%",
        "totalBoxOffice": "4.35亿",
        "showCount": 99710,
        "seatRate": "2.5%",
        "viewPerShow": "3.4"
      }
      // … 实测共 63 条
    ]
  },
  "meta": {
    "requestId": "muzifpj8-9179c6b1",
    "serverTime": "2026-10-08T12:26:03.477Z",
    "site": "Decamore API"
  }
}`,
  },
  {
    value: 'cached',
    label: '200 · 命中缓存',
    lang: 'json',
    code: `// 一小时内再打一次：items 与 updateTime 都不变，只有 cached 变成 true
{
  "statusCode": 200,
  "message": "success",
  "data": {
    "updateTime": "2026-10-08T12:26:03.620Z",
    "cached": true,
    "items": [ /* 同上 63 条 */ ]
  },
  "meta": {
    "requestId": "muzig3l5-4e862146",
    "serverTime": "2026-10-08T12:27:41.083Z",
    "site": "Decamore API"
  }
}`,
  },
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const hotchartDoc: AuthoredApiDoc = {
  eyebrow: 'Data API · v1',
  lede: '此刻院线的实时票房榜',
  facts: ['无参数，一份榜', '服务端缓存 1 小时'],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-08' },
    { label: '榜单条数', value: '实测 63 部在映' },
    { label: '服务端缓存', value: '1 小时' },
    { label: '限频', value: '120 次 / 分钟 / IP' },
  ],
  sections,
  requestPanes,
  responsePanes,
};

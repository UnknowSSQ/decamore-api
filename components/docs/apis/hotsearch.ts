/** 接口文档内容；字段行为与数字均为 2026-10-08 实测 */
import { frag, para, text } from '../fragments';
import { apiUrl } from '../url';
import { RATE_LIMIT_ROW, headersSection, requestSection } from '../commonSections';
import type { AuthoredApiDoc, CodePaneData, DocSection } from '../types';

const path = '/api/v1/hotsearch';
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(
        ...text(
          '各站热榜聚合：微博、抖音、百度、知乎，',
        ),
      ),
      para(
        ...frag`对外接口返回单层信封 ${'{ statusCode, message, data, meta }'}：${'data'} 是一份榜单，${'meta'} 收敛调用元信息（${'requestId'} / ${'serverTime'} / ${'site'}）。其中 ${'requestId'} 与响应头 ${'x-trace-id'} 同值，反馈问题时提供它即可定位到服务端日志。`,
      ),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '持续更新ing',
        fragments: text(
          '目前集成了4家平台，后续会丰富其他平台的榜单。',
        ),
      },
    ],
  },
  requestSection({ path }),
  {
    id: 'params',
    title: '请求参数',
    content: [
      {
        kind: 'table',
        variant: 'params',
        rows: [
          {
            name: 'platform',
            type: 'weibo / douyin / baidu / zhihu',
            required: 'no',
            defaultValue: 'weibo',
            description: [
              { type: 'code', value: '?platform=' },
              { type: 'text', value: '留空或不传时给微博；' },
            ],
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
        strong: '拼错的平台名不会被当成微博。',
        fragments: text(
          '?platform=twitter 直接返回 422',
        ),
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
          { name: 'data', type: 'object', description: text('这一家的榜单。') },
          {
            name: 'platform',
            type: 'string',
            description: text('这份数据实际来自哪家；你没传时这里是 weibo。'),
            isChild: true,
          },
          {
            name: 'updatedAt',
            type: 'string',
            description: text(
              '这份榜单的更新时间（ISO 8601，UTC）。',
            ),
            isChild: true,
          },
          {
            name: 'cached',
            type: 'boolean',
            description: text('命中 60 秒缓存时为 true'),
            isChild: true,
          },
          {
            name: 'items',
            type: 'array',
            description: text('榜单条目'),
            isChild: true,
          },
          {
            name: 'rank',
            type: 'integer',
            description: text('排名'),
            isChild: true,
          },
          { name: 'title', type: 'string', description: text('榜单标题原文'), isChild: true },
          {
            name: 'heat',
            type: 'integer | null',
            description: text(
              '热度数值',
            ),
            isChild: true,
          },
          {
            name: 'heatLabel',
            type: 'string | null',
            description: text('热度文案'),
            isChild: true,
          },
          {
            name: 'url',
            type: 'string',
            description: text(
              '热搜链接',
            ),
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
        strong: '热度数字不能跨平台比。',
        fragments: text(
          '热度算法不同',
        ),
      },
    ],
  },
  headersSection({
    cache: text('响应按服务端同一份榜单缓存 60 秒，同窗口内浏览器可直接复用；因为 CORS 来源可变，所以是 private。'),
    cacheExample: 'private, max-age=60, stale-while-revalidate=30',
    traceId: 'muzg2vvb-69e950cf',
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
            http: '422',
            statusCode: '422',
            label: '平台不合法',
            description: [
              { type: 'text', value: 'message 为「platform 只能是 weibo、douyin、baidu 或 zhihu」，并带 ' },
              { type: 'code', value: 'issues' },
              { type: 'text', value: ' 指明是 platform 字段。' },
            ],
            suggestion: text('把取值收敛到这四家；想省事就一个都不传，走微博。'),
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
            suggestion: text('榜单本身 60 秒更新，按 Retry-After 歇一会儿。'),
          },
          {
            http: '503',
            statusCode: '503',
            label: '上游取不到',
            description: text('description 会带上失败原因'),
            suggestion: text('换一家或稍后再试；一直不行的话，带着 traceId 来找我们。'),
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '没有 404，也不会给你空列表。',
        fragments: text(
          '随机榜单没有「查无此条」这回事；只要从上游结构里取不到可用条目，接口就直接 503，而不是返回一个 items: [] 让你自己猜哪儿出了问题。',
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
            limit: '60 秒 / 每平台',
            description: text('四家各存一份，命中时 cached=true；'),
          },
          {
            item: '缓存实现',
            limit: '进程内存',
            description: text('单进程内存表'),
          },
          {
            item: '并发建议',
            limit: '≤ 2 QPS',
            description: text('不建议'),
          },
          {
            item: '客户端建议',
            limit: '轮询 ≥ 60 s',
            description: text('比缓存周期更快的轮询拿到的还是同一份榜，只是白耗配额；直链和标题都可以按平台在本地存一会儿。'),
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
            description: text('热搜榜上线：微博 / 抖音 / 百度 / 知乎四家榜单，platform 可选，服务端按平台缓存 60 秒。'),
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
    code: `# 不传 platform：默认微博
curl "${url}"

# 指定平台
curl "${url}?platform=douyin"
curl "${url}?platform=baidu"
curl "${url}?platform=zhihu"`,
  },
  {
    value: 'js',
    label: 'JavaScript',
    lang: 'js',
    code: `const res = await fetch("${url}?platform=weibo");
const { statusCode, message, data, meta } = await res.json();

if (statusCode === 200) {
  console.log(data.platform, data.items.length + " 条", "cached:", data.cached, data.updatedAt);
  for (const item of data.items.slice(0, 5)) {
    console.log(item.rank, item.title, item.heat ?? item.heatLabel ?? "-");
    console.log("  ", item.url);
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

body = requests.get("${url}", params={"platform": "zhihu"}).json()
data = body["data"]
print(data["platform"], len(data["items"]), "cached:", data["cached"])
for item in data["items"][:5]:
    print(item["rank"], item["title"], item["heat"] or item["heatLabel"])`,
  },
];

const responsePanes: CodePaneData[] = [
  {
    value: 'ok',
    label: '200 · weibo',
    lang: 'json',
    code: `{
  "statusCode": 200,
  "message": "success",
  "data": {
    "platform": "weibo",
    "updatedAt": "2026-10-08T11:18:53.431Z",
    "cached": true,
    "items": [
      {
        "rank": 1,
        "title": "西西弗书店是如何盈利的",
        "heat": 1172710,
        "heatLabel": null,
        "url": "https://s.weibo.com/weibo?q=%23%E8%A5%BF%E8%A5%BF%E5%BC%97%E4%B9%A6%E5%BA%97%E6%98%AF%E5%A6%82%E4%BD%95%E7%9B%88%E5%88%A9%E7%9A%84%23"
      },
      {
        "rank": 2,
        "title": "三甲医生回应喝大水",
        "heat": 871244,
        "heatLabel": null,
        "url": "https://s.weibo.com/weibo?q=%23%E4%B8%89%E7%94%B2%E5%8C%BB%E7%94%9F%E5%9B%9E%E5%BA%94%E5%96%9D%E5%A4%A7%E6%B0%B4%23"
      }
      // … 实测共 51 条
    ]
  },
  "meta": {
    "requestId": "muzg3no6-24626ffc",
    "serverTime": "2026-10-08T11:20:40.871Z",
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
  "message": "platform 只能是 weibo、douyin、baidu 或 zhihu",
  "description": "platform：platform 只能是 weibo、douyin、baidu 或 zhihu",
  "issues": [
    { "field": "platform", "message": "platform 只能是 weibo、douyin、baidu 或 zhihu", "code": "invalid_type" }
  ],
  "data": null,
  "meta": {
    "timestamp": 1791458405350,
    "traceId": "muzg2w9n-ddba114c"
  }
}`,
  },
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const hotsearchDoc: AuthoredApiDoc = {
  eyebrow: 'Content API · v1',
  lede: '热搜榜太多？一个就够用了',
  facts: ['四家平台，缺省微博', '服务端缓存 60 秒'],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-08' },
    { label: '平台', value: 'weibo · douyin · baidu · zhihu' },
    { label: '服务端缓存', value: '60 秒 / 每平台' },
    { label: '限频', value: '120 次 / 分钟 / IP' },
  ],
  sections,
  requestPanes,
  responsePanes,
};

/** 接口文档内容；字段行为与数字均为 2026-10-08 实测 */
import { API } from '@/lib/api/endpoints';
import { para, text } from '../fragments';
import { apiUrl } from '../url';
import {
  CACHE_IMPL_ROW,
  METHOD_NOT_SUPPORTED_ROW,
  RATE_LIMIT_ROW,
  UPSTREAM_TIMEOUT_ROW,
  cachedRow,
  changelogSection,
  envelopeOverview,
  errorsSection,
  headersSection,
  limitsSection,
  paramsSection,
  rateLimitText,
  rateLimitedRow,
  requestSection,
  responseSection,
  successPane,
} from '../commonSections';
import type { AuthoredApiDoc, CodePaneData, DocSection } from '../types';

const path = API.publicApi.hotchart;
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(...text('院线此刻的实时票房榜：按当日票房从高到低排好的在映影片。')),
      envelopeOverview('是整份榜单'),
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
  paramsSection(
    [
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
    {
      kind: 'callout',
      tone: 'warn',
      mark: '!',
      strong: '这份榜不分剧集、综艺。',
      fragments: text('要按类别看大屏播出榜，走 /api/v1/hotplay。'),
    },
    para(...text('只有一个可选的 limit，空 GET 就是完整调用。')),
  ),
  responseSection(
    '整份榜单。',
    [
      {
        name: 'updateTime',
        type: 'string',
        description: text('榜单自身的更新时间（ISO 8601，UTC）。'),
        isChild: true,
      },
      cachedRow('1 小时'),
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
        description: text('累计票房原文，如「1.89亿」，是给人看的字符串，不是数值'),
        isChild: true,
      },
      { name: 'showCount', type: 'integer | null', description: text('当日排片场次数'), isChild: true },
      { name: 'seatRate', type: 'string | null', description: text('上座率原文，如「2.6%」'), isChild: true },
      { name: 'viewPerShow', type: 'string | null', description: text('场均人次原文，如「3.9」'), isChild: true },
    ],
    {
      kind: 'callout',
      tone: 'info',
      mark: 'i',
      strong: '没有 url 字段。',
      fragments: text('影片页在对方自己的反爬里会反复重定向，与其给一个打不开的链接，不如不给。'),
    },
  ),
  headersSection({
    cache: text('响应按服务端同一份榜单缓存 3600 秒，同窗口内浏览器可直接复用；因为 CORS 来源可变，所以是 private。'),
    cacheExample: 'private, max-age=3600, stale-while-revalidate=1800',
    traceId: 'muzifpj8-9179c6b1',
  }),
  errorsSection(
    [
      METHOD_NOT_SUPPORTED_ROW,
      // 这一行的说明句式不是「message 为「…」」，validationRow 套不进去，留字面量
      {
        http: '422',
        statusCode: '422',
        label: 'limit 不合法',
        description: [
          { type: 'text', value: 'message 直接用 zod 的英文原文（如「Number must be less than or equal to 100」），并带 ' },
          { type: 'code', value: 'issues' },
          { type: 'text', value: ' 指明是 limit 字段。' },
        ],
        suggestion: text('传 1–100 的整数，或者不传。'),
      },
      rateLimitedRow(text('接口对外缓存 1 小时，更快的轮询拿到的还是同一份榜。')),
      {
        http: '503',
        statusCode: '503',
        label: '上游取不到',
        description: text('message 为「热映榜暂时取不到」，description 会带上失败原因'),
        suggestion: text('稍后再试；一直不行的话，带着 traceId 来找我们。'),
      },
    ],
    {
      hasValidation: true,
      callout: {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '没有 400 / 404。',
        fragments: text(
          '唯一的参数错误是 limit 越界或不是整数带来的 422；取不到可用影片时直接 503，不存在查无此榜的分支。',
        ),
      },
    },
  ),
  limitsSection([
    RATE_LIMIT_ROW,
    {
      item: '榜单缓存',
      limit: '1 小时',
      description: text('命中时 cached=true；'),
    },
    CACHE_IMPL_ROW,
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
    UPSTREAM_TIMEOUT_ROW,
  ]),
  changelogSection([
    {
      date: '2026-10-08',
      version: 'v1.0',
      description: text('热映榜上线：猫眼实时票房榜，服务端缓存 1 小时，返回影片名、当日票房与占比、累计票房、场次与上座率。'),
    },
  ]),
];


const requestPanes: CodePaneData[] = [
  {
    value: 'curl',
    label: 'cURL',
    lang: 'bash',
    code: `# 只要前 N 条就带 limit，不传则整份榜单返回
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
  successPane({
    label: '200 · 回源',
    requestId: 'muzifpj8-9179c6b1',
    serverTime: '2026-10-08T12:26:03.477Z',
    dataJson: `{
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
  }`,
  }),
  // 这一窗 value 是 cached，且 JSON 前还有一行说明注释，successPane 表达不了，留字面量
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
  facts: ['只有一个可选的 limit', '服务端缓存 1 小时'],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-08' },
    { label: '榜单条数', value: '实测 63 部在映' },
    { label: '服务端缓存', value: '1 小时' },
    { label: '限频', value: rateLimitText },
  ],
  sections,
  requestPanes,
  responsePanes,
};

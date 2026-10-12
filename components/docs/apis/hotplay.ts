/** 接口文档内容；字段行为与数字均为 2026-10-08 实测 */
import { API } from '@/lib/api/endpoints';
import { HOT_PLAY_TYPE_HINT } from '@/lib/zod/public.schema';
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
  failurePane,
  headersSection,
  limitsSection,
  paramsSection,
  rateLimitText,
  rateLimitedRow,
  requestSection,
  responseSection,
  successPane,
  validationRow,
} from '../commonSections';
import type { AuthoredApiDoc, CodePaneData, DocSection } from '../types';

const path = API.publicApi.hotplay;
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(...text('大屏播出榜：电视剧、电影、综艺三张榜，顺带给出每部剧在哪些平台的 TV 端播。')),
      envelopeOverview('是一份榜单'),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '这是大屏播出榜，不是网络热度榜。',
        fragments: text('heat 与 score 是欢网自己的指数，不是视频网站的播放量，也别拿去和热搜、热歌的数字比大小。'),
      },
    ],
  },
  requestSection({ path }),
  paramsSection(
    [
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
      strong: '这里没有纪录片榜、也没有动漫榜。',
      fragments: text('上游只有 1（电视剧）、2（综艺）、3（电影）三类有数据，?type=anime 直接返回 422。'),
    },
  ),
  responseSection(
    '这一类的榜单。',
    [
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
      cachedRow('10 分钟'),
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
    ],
    {
      kind: 'callout',
      tone: 'info',
      mark: 'i',
      strong: '没有 url 字段。',
      fragments: text('上游榜单数据里不含落地页链接，也不拿平台名去拼一个看着能点的地址。'),
    },
  ),
  headersSection({
    cache: text('响应按服务端同一份榜单缓存 600 秒，同窗口内浏览器可直接复用；因为 CORS 来源可变，所以是 private。'),
    cacheExample: 'private, max-age=600, stale-while-revalidate=300',
    traceId: 'muzi2zsp-516ebcc8',
  }),
  errorsSection(
    [
      METHOD_NOT_SUPPORTED_ROW,
      validationRow({
        label: '参数不合法',
        message: HOT_PLAY_TYPE_HINT,
        field: 'type',
        suggestion: text('把取值收敛到这三类；想省事就一个都不传，走电视剧榜。'),
      }),
      rateLimitedRow(text('榜面一天才更新一次，轮询再快也不会更早看到新剧。')),
      {
        http: '503',
        statusCode: '503',
        label: '上游取不到',
        description: text('message 形如「电视剧热播榜暂时取不到」，description 会带上失败原因'),
        suggestion: text('换一类或稍后再试；一直不行的话，带着 traceId 来找我们。'),
      },
    ],
    {
      hasValidation: true,
      callout: {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '不会返回空列表。',
        fragments: text('取不到可用条目时直接 503，而不是给你一个 items: [] 让你自己猜原因。'),
      },
    },
  ),
  limitsSection([
    RATE_LIMIT_ROW,
    {
      item: '榜单缓存',
      limit: '10 分钟 / 每类型',
      description: text('三张榜各存一份，命中时 cached=true；'),
    },
    CACHE_IMPL_ROW,
    {
      item: '外部依赖',
      limit: '欢网大数据',
      description: text('需要带它站内的 referer；实测免 cookie、免签名，但不属于公开文档接口，改版会直接体现为 503。'),
    },
    {
      item: '回退策略',
      limit: '当天 → last_time',
      description: text('当天没出榜就顺着上游给的 last_time 再取一次，boardDate 是最终命中的那个日期。'),
    },
    {
      item: '并发建议',
      limit: '≤ 2 QPS',
      description: text('不建议'),
    },
    {
      item: '客户端建议',
      limit: '轮询 ≥ 10 min',
      description: text('比缓存周期更快的轮询拿到的还是同一份榜，只是白耗配额。'),
    },
    UPSTREAM_TIMEOUT_ROW,
  ]),
  changelogSection([
    {
      date: '2026-10-08',
      version: 'v1.0',
      description: text('热播榜上线：电视剧 / 电影 / 综艺三类大屏播出榜，type 可选，服务端按类型缓存 10 分钟，带 last_time 回退。'),
    },
  ]),
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
  successPane({
    label: '200 · tv',
    requestId: 'muzi2zsp-516ebcc8',
    serverTime: '2026-10-08T12:16:09.165Z',
    dataJson: `{
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
  }`,
  }),
  successPane({
    label: '200 · movie',
    value: 'movie',
    requestId: 'muzi2ztl-2709215f',
    serverTime: '2026-10-08T12:16:09.188Z',
    dataJson: `{
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
  }`,
  }),
  failurePane({
    statusCode: 422,
    message: HOT_PLAY_TYPE_HINT,
    requestId: 'muzi2zu3-c0b4ea22',
    serverTime: '2026-10-08T12:16:09.208Z',
    description: `type：${HOT_PLAY_TYPE_HINT}`,
    issues: [
      { field: 'type', message: HOT_PLAY_TYPE_HINT, code: 'invalid_type' },
    ],
  }),
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const hotplayDoc: AuthoredApiDoc = {
  eyebrow: 'Content API · v1',
  lede: '剧集、电影、综艺在大屏上怎么播',
  facts: ['三类榜单，缺省电视剧', '服务端缓存 10 分钟'],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-08' },
    { label: '榜单类型', value: 'tv · movie · variety' },
    { label: '服务端缓存', value: '10 分钟 / 每类型' },
    { label: '限频', value: rateLimitText },
  ],
  sections,
  requestPanes,
  responsePanes,
};

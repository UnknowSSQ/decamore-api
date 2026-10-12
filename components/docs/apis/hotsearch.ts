/** 接口文档内容；字段行为与数字均为 2026-10-08 实测 */
import { API } from '@/lib/api/endpoints';
import { HOT_SEARCH_PLATFORM_HINT, HOT_SEARCH_PLATFORMS } from '@/lib/zod/public.schema';
import { para, text } from '../fragments';
import { apiUrl } from '../url';
import {
  CACHE_IMPL_ROW,
  METHOD_NOT_SUPPORTED_ROW,
  cachedRow,
  changelogSection,
  envelopeOverview,
  errorsSection,
  failurePane,
  headersSection,
  limitsSection,
  paramsSection,
  RATE_LIMIT_ROW,
  rateLimitText,
  rateLimitedRow,
  requestSection,
  responseSection,
  successPane,
  UPSTREAM_TIMEOUT_ROW,
  validationRow,
} from '../commonSections';
import type { AuthoredApiDoc, CodePaneData, DocSection } from '../types';

const path = API.publicApi.hotsearch;
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(
        ...text(
          '各站热榜聚合：微博、抖音、百度、知乎、B 站、今日头条，',
        ),
      ),
      envelopeOverview('是一份榜单'),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '当前只接了六家平台。',
        fragments: text(
          '六家各一张榜，platform 传别的值返回 422。新平台接入前，这里不会多出选项。',
        ),
      },
    ],
  },
  requestSection({ path }),
  paramsSection(
    [
      {
        name: 'platform',
        type: HOT_SEARCH_PLATFORMS.join(' / '),
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
    {
      kind: 'callout',
      tone: 'warn',
      mark: '!',
      strong: '拼错的平台名不会被当成微博。',
      fragments: text(
        '?platform=twitter 直接返回 422',
      ),
    },
  ),
  responseSection(
    '这一家的榜单。',
    [
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
      cachedRow('60 秒'),
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
          '热度数值。微博 / 抖音 / 百度是平台自己的热度值，B 站这一列是视频播放量（它的热搜词接口实测不给数值），今日头条是热榜自己的热值（实测 1,407,362 到 18,899,507，全榜严格降序）',
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
          '热搜链接。B 站给的是视频页直链（https://www.bilibili.com/video/BV…），不是搜索页',
        ),
        isChild: true,
      },
    ],
    {
      kind: 'callout',
      tone: 'info',
      mark: 'i',
      strong: '热度数字不能跨平台比。',
      fragments: text(
        '热度算法不同',
      ),
    },
  ),
  headersSection({
    cache: text('响应按服务端同一份榜单缓存 60 秒，同窗口内浏览器可直接复用；因为 CORS 来源可变，所以是 private。'),
    cacheExample: 'private, max-age=60, stale-while-revalidate=30',
    traceId: 'muzg3no6-24626ffc',
  }),
  errorsSection(
    [
      METHOD_NOT_SUPPORTED_ROW,
      validationRow({
        label: '平台不合法',
        message: HOT_SEARCH_PLATFORM_HINT,
        field: 'platform',
        suggestion: text('把取值收敛到这六家；想省事就一个都不传，走微博。'),
      }),
      rateLimitedRow(text('榜单本身 60 秒更新，按 Retry-After 歇一会儿。')),
      {
        http: '503',
        statusCode: '503',
        label: '上游取不到',
        description: text('description 会带上失败原因'),
        suggestion: text('换一家或稍后再试；一直不行的话，带着 traceId 来找我们。'),
      },
    ],
    {
      hasValidation: true,
      callout: {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '没有 404，也不会给你空列表。',
        fragments: text(
          '随机榜单没有「查无此条」这回事；只要从上游结构里取不到可用条目，接口就直接 503，而不是返回一个 items: [] 让你自己猜哪儿出了问题。',
        ),
      },
    },
  ),
  limitsSection([
    RATE_LIMIT_ROW,
    {
      item: '榜单缓存',
      limit: '60 秒 / 每平台',
      description: text('六家各存一份，命中时 cached=true；'),
    },
    CACHE_IMPL_ROW,
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
    UPSTREAM_TIMEOUT_ROW,
  ]),
  changelogSection([
    {
      date: '2026-10-11',
      version: 'v1.2',
      description: text('加今日头条第六家：热榜 data 数组直接给排名顺序，heat 是热值、url 是热榜专题页（上游那串约 700 字符的 log_pb 跟踪参数已剥掉），条目实测 50 条。'),
    },
    {
      date: '2026-10-11',
      version: 'v1.1',
      description: text('加 B 站第五家：取的是热门视频榜，heat 这一列是播放量、url 是视频页直链，条目实测 20 条。'),
    },
    {
      date: '2026-10-08',
      version: 'v1.0',
      description: text('热搜榜上线：微博 / 抖音 / 百度 / 知乎四家榜单，platform 可选，服务端按平台缓存 60 秒。'),
    },
  ]),
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
curl "${url}?platform=zhihu"
curl "${url}?platform=bilibili"`,
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
  successPane({
    label: '200 · weibo',
    requestId: 'muzg3no6-24626ffc',
    serverTime: '2026-10-08T11:20:40.871Z',
    dataJson: `{
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
  }`,
  }),
  successPane({
    label: '200 · bilibili',
    value: 'bilibili',
    requestId: 'mv3l523s-59460c015875',
    serverTime: '2026-10-11T08:52:49.000Z',
    dataJson: `{
    "platform": "bilibili",
    "updatedAt": "2026-10-11T08:51:58.282Z",
    "cached": true,
    "items": [
      {
        "rank": 1,
        "title": "如果把我和男朋友这几年的约会地点列出来",
        "heat": 848594,
        "heatLabel": null,
        "url": "https://www.bilibili.com/video/BV16xpt6BE6t"
      },
      {
        "rank": 2,
        "title": "也是当上外卖大法官了",
        "heat": 1426299,
        "heatLabel": null,
        "url": "https://www.bilibili.com/video/BV1Vtpg65EnA"
      }
      // … 实测共 20 条；这一家的 heat 是播放量
    ]
  }`,
  }),
  successPane({
    label: '200 · toutiao',
    value: 'toutiao',
    requestId: 'mv3udh6r-5475d3eac748',
    serverTime: '2026-10-11T13:11:18.645Z',
    dataJson: `{
    "platform": "toutiao",
    "updatedAt": "2026-10-11T13:11:18.645Z",
    "cached": false,
    "items": [
      {
        "rank": 1,
        "title": "郑钦文冲中网首冠",
        "heat": 18914432,
        "heatLabel": null,
        "url": "https://webcast-open.douyin.com/open/media_live/317636109251"
      },
      {
        "rank": 2,
        "title": "大二专科生称靠切片三年赚七百万",
        "heat": 17114485,
        "heatLabel": null,
        "url": "https://www.toutiao.com/trending/7695212095247499305/"
      },
      {
        "rank": 3,
        "title": "节后错峰出游持续升温",
        "heat": 15485827,
        "heatLabel": null,
        "url": "https://www.toutiao.com/trending/7694292556233916457/"
      }
      // … 这个样例只取了 limit=3；不传 limit 实测共 50 条
    ]
  }`,
  }),
  failurePane({
    statusCode: 422,
    message: HOT_SEARCH_PLATFORM_HINT,
    requestId: 'mv3l5241-c887b35d1ad8',
    serverTime: '2026-10-11T08:52:49.009Z',
    description: `platform：${HOT_SEARCH_PLATFORM_HINT}`,
    issues: [
      { field: 'platform', message: HOT_SEARCH_PLATFORM_HINT, code: 'invalid_type' },
    ],
  }),
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const hotsearchDoc: AuthoredApiDoc = {
  eyebrow: 'Content API · v1',
  lede: '热搜榜太多？一个就够用了',
  facts: ['六家平台，缺省微博', '服务端缓存 60 秒'],
  metaRows: [
    { label: '当前版本', value: 'v1.2' },
    { label: '首版发布', value: '2026-10-08' },
    { label: '平台', value: HOT_SEARCH_PLATFORMS.join(' · ') },
    { label: '服务端缓存', value: '60 秒 / 每平台' },
    { label: '限频', value: rateLimitText },
  ],
  sections,
  requestPanes,
  responsePanes,
};

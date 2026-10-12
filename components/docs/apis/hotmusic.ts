/** 接口文档内容；字段行为与数字均为 2026-10-08 实测 */
import { API } from '@/lib/api/endpoints';
import { HOT_MUSIC_PLATFORM_HINT } from '@/lib/zod/public.schema';
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

const path = API.publicApi.hotmusic;
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(...text('三家音乐平台的热歌榜：QQ 音乐、网易云、酷狗，一次换一家。')),
      envelopeOverview('是一份榜单'),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '只给前 30 名。',
        fragments: text('上游其实给得多（QQ 音乐 300 首、网易云 200 首、酷狗 30 首），统一裁到 30 条。'),
      },
    ],
  },
  requestSection({ path }),
  paramsSection(
    [
      {
        name: 'platform',
        type: 'qq / netease / kugou',
        required: 'no',
        defaultValue: 'qq',
        description: [
          { type: 'code', value: '?platform=' },
          { type: 'text', value: '留空或不传时给 QQ 音乐；' },
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
      strong: '拼错的平台名不会被当成 QQ 音乐。',
      fragments: text('?platform=kugou2 直接返回 422'),
    },
  ),
  responseSection(
    '这一家的榜单。',
    [
      {
        name: 'platform',
        type: 'string',
        description: text('这份数据实际来自哪家；你没传时这里是 qq。'),
        isChild: true,
      },
      {
        name: 'chartName',
        type: 'string',
        description: text('上游自己的榜名：巅峰榜·热歌 / 热歌榜 / TOP500。'),
        isChild: true,
      },
      {
        name: 'updatedAt',
        type: 'string',
        description: text(
          '这份榜单的更新时间（ISO 8601，UTC）。QQ 音乐上游只给到日期，所以它常落在 16:00:00.000Z 这种整天边界。',
        ),
        isChild: true,
      },
      cachedRow('60 秒'),
      { name: 'items', type: 'array', description: text('榜单条目'), isChild: true },
      { name: 'rank', type: 'integer', description: text('排名'), isChild: true },
      { name: 'title', type: 'string', description: text('歌名原文'), isChild: true },
      { name: 'artists', type: 'string', description: text('歌手，多位用「/」连接'), isChild: true },
      { name: 'album', type: 'string | null', description: text('专辑名；酷狗恒为 null'), isChild: true },
      { name: 'duration', type: 'integer | null', description: text('时长（秒）'), isChild: true },
      { name: 'url', type: 'string', description: text('这首歌在该平台站内的播放页'), isChild: true },
    ],
    {
      kind: 'callout',
      tone: 'info',
      mark: 'i',
      strong: '三家的榜不是同一批歌。',
      fragments: text('各家算法不同，别把它们当成同一份榜的三个视图去合并。'),
    },
  ),
  headersSection({
    cache: text('响应按服务端同一份榜单缓存 60 秒，同窗口内浏览器可直接复用；因为 CORS 来源可变，所以是 private。'),
    cacheExample: 'private, max-age=60, stale-while-revalidate=30',
    traceId: 'muzhf0qg-ae999aed',
  }),
  errorsSection(
    [
      METHOD_NOT_SUPPORTED_ROW,
      validationRow({
        label: '平台不合法',
        message: HOT_MUSIC_PLATFORM_HINT,
        field: 'platform',
        suggestion: text('把取值收敛到这三家；想省事就一个都不传，走 QQ 音乐。'),
      }),
      rateLimitedRow(text('榜单本身 60 秒更新，按 Retry-After 歇一会儿。')),
      {
        http: '503',
        statusCode: '503',
        label: '上游取不到',
        description: text('message 形如「QQ音乐热歌榜暂时取不到」，description 会带上失败原因'),
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
          '取不到可用曲目时接口直接 503，而不是返回一个 items: [] 让你自己猜哪儿出了问题。',
        ),
      },
    },
  ),
  limitsSection([
    RATE_LIMIT_ROW,
    {
      item: '榜单缓存',
      limit: '60 秒 / 每平台',
      description: text('三家各存一份，命中时 cached=true；'),
    },
    CACHE_IMPL_ROW,
    {
      item: '外部依赖',
      limit: '三家音乐平台',
      description: text('各家自己的网页端接口，实测免 cookie、免签名，但不属于公开文档接口，改版会立刻体现为 503。'),
    },
    {
      item: '并发建议',
      limit: '≤ 2 QPS',
      description: text('不建议'),
    },
    {
      item: '客户端建议',
      limit: '轮询 ≥ 60 s',
      description: text('比缓存周期更快的轮询拿到的还是同一份榜，只是白耗配额；曲目和播放页链接都可以在本地存一会儿。'),
    },
    UPSTREAM_TIMEOUT_ROW,
  ]),
  changelogSection([
    {
      date: '2026-10-08',
      version: 'v1.0',
      description: text('热歌榜上线：QQ 音乐 / 网易云 / 酷狗三家榜单，platform 可选，服务端按平台缓存 60 秒，统一返回前 30 名。'),
    },
  ]),
];


const requestPanes: CodePaneData[] = [
  {
    value: 'curl',
    label: 'cURL',
    lang: 'bash',
    code: `# 不传 platform：默认 QQ 音乐
curl "${url}"

# 指定平台
curl "${url}?platform=qq"
curl "${url}?platform=netease"
curl "${url}?platform=kugou"`,
  },
  {
    value: 'js',
    label: 'JavaScript',
    lang: 'js',
    code: `const res = await fetch("${url}?platform=netease");
const { statusCode, message, data, meta } = await res.json();

if (statusCode === 200) {
  console.log(data.platform, data.chartName, data.items.length + " 首", "cached:", data.cached);
  for (const song of data.items.slice(0, 5)) {
    const len = song.duration ? Math.floor(song.duration / 60) + ":" + String(song.duration % 60).padStart(2, "0") : "-";
    console.log(song.rank, song.title, "—", song.artists, len, song.album ?? "");
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

body = requests.get("${url}", params={"platform": "kugou"}).json()
data = body["data"]
print(data["platform"], data["chartName"], len(data["items"]), "cached:", data["cached"])
for song in data["items"][:5]:
    print(song["rank"], song["title"], "—", song["artists"], song["duration"], song["url"])`,
  },
];

const responsePanes: CodePaneData[] = [
  successPane({
    label: '200 · qq',
    requestId: 'muzhf0qg-ae999aed',
    serverTime: '2026-10-08T11:57:31.241Z',
    dataJson: `{
    "platform": "qq",
    "chartName": "巅峰榜·热歌",
    "updatedAt": "2026-10-07T16:00:00.000Z",
    "cached": true,
    "items": [
      {
        "rank": 1,
        "title": "我不难过",
        "artists": "孙燕姿",
        "album": "未完成",
        "duration": 320,
        "url": "https://y.qq.com/n/yqq/song/001fsNdn1zuZnA.html"
      },
      {
        "rank": 2,
        "title": "甲乙丙丁 (你我怎么两清)",
        "artists": "李佳薇",
        "album": "甲乙丙丁",
        "duration": 210,
        "url": "https://y.qq.com/n/yqq/song/002AZauQ1UKQxe.html"
      }
      // … 共 30 条（上游给 300 首，已裁剪）
    ]
  }`,
  }),
  successPane({
    label: '200 · kugou',
    value: 'kugou',
    requestId: 'muzhf18o-162098ed',
    serverTime: '2026-10-08T11:57:31.463Z',
    dataJson: `{
    "platform": "kugou",
    "chartName": "TOP500",
    "updatedAt": "2026-10-08T11:55:44.000Z",
    "cached": true,
    "items": [
      {
        "rank": 1,
        "title": "自由的你",
        "artists": "G.E.M.邓紫棋",
        "album": null,
        "duration": 296,
        "url": "https://m.kugou.com/mixsong/fxswxgf2.html"
      }
      // … 共 30 条
    ]
  }`,
  }),
  failurePane({
    statusCode: 422,
    message: HOT_MUSIC_PLATFORM_HINT,
    requestId: 'muzi2zu3-c0b4ea22',
    serverTime: '2026-10-08T11:57:31.482Z',
    description: `platform：${HOT_MUSIC_PLATFORM_HINT}`,
    issues: [
      { field: 'platform', message: HOT_MUSIC_PLATFORM_HINT, code: 'invalid_type' },
    ],
  }),
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const hotmusicDoc: AuthoredApiDoc = {
  eyebrow: 'Content API · v1',
  lede: '三家在放什么歌，一次换一家',
  facts: ['三家平台，缺省 QQ 音乐', '服务端缓存 60 秒'],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-08' },
    { label: '平台', value: 'qq · netease · kugou' },
    { label: '服务端缓存', value: '60 秒 / 每平台' },
    { label: '限频', value: rateLimitText },
  ],
  sections,
  requestPanes,
  responsePanes,
};

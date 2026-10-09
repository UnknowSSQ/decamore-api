/** 接口文档内容；字段行为与数字均为 2026-10-08 实测 */
import { frag, para, text } from '../fragments';
import { apiUrl } from '../url';
import { RATE_LIMIT_ROW, headersSection, requestSection } from '../commonSections';
import type { AuthoredApiDoc, CodePaneData, DocSection } from '../types';

const path = '/api/v1/hotmusic';
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(...text('三家音乐平台的热歌榜：QQ 音乐、网易云、酷狗，一次换一家。')),
      para(
        ...frag`对外接口返回单层信封 ${'{ statusCode, message, data, meta }'}：${'data'} 是一份榜单，${'meta'} 收敛调用元信息（${'requestId'} / ${'serverTime'} / ${'site'}）。其中 ${'requestId'} 与响应头 ${'x-trace-id'} 同值，反馈问题时提供它即可定位到服务端日志。`,
      ),
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
            type: 'qq / netease / kugou',
            required: 'no',
            defaultValue: 'qq',
            description: [
              { type: 'code', value: '?platform=' },
              { type: 'text', value: '留空或不传时给 QQ 音乐；' },
            ],
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'warn',
        mark: '!',
        strong: '拼错的平台名不会被当成 QQ 音乐。',
        fragments: text('?platform=kugou2 直接返回 422'),
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
          {
            name: 'cached',
            type: 'boolean',
            description: text('命中 60 秒缓存时为 true'),
            isChild: true,
          },
          { name: 'items', type: 'array', description: text('榜单条目'), isChild: true },
          { name: 'rank', type: 'integer', description: text('排名'), isChild: true },
          { name: 'title', type: 'string', description: text('歌名原文'), isChild: true },
          { name: 'artists', type: 'string', description: text('歌手，多位用「/」连接'), isChild: true },
          { name: 'album', type: 'string | null', description: text('专辑名；酷狗恒为 null'), isChild: true },
          { name: 'duration', type: 'integer | null', description: text('时长（秒）'), isChild: true },
          { name: 'url', type: 'string', description: text('这首歌在该平台站内的播放页'), isChild: true },
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
        strong: '三家的榜不是同一批歌。',
        fragments: text('各家算法不同，别把它们当成同一份榜的三个视图去合并。'),
      },
    ],
  },
  headersSection({
    cache: text('接口响应不缓存'),
    traceId: 'muzhf0qg-ae999aed',
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
              { type: 'text', value: 'message 为「platform 只能是 qq、netease 或 kugou」，并带 ' },
              { type: 'code', value: 'issues' },
              { type: 'text', value: ' 指明是 platform 字段。' },
            ],
            suggestion: text('把取值收敛到这三家；想省事就一个都不传，走 QQ 音乐。'),
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
            description: text('message 形如「QQ音乐热歌榜暂时取不到」，description 会带上失败原因'),
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
          '取不到可用曲目时接口直接 503，而不是返回一个 items: [] 让你自己猜哪儿出了问题。',
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
            description: text('三家各存一份，命中时 cached=true；'),
          },
          {
            item: '缓存实现',
            limit: '进程内存',
            description: text('单进程内存表'),
          },
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
            description: text('热歌榜上线：QQ 音乐 / 网易云 / 酷狗三家榜单，platform 可选，服务端按平台缓存 60 秒，统一返回前 30 名。'),
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
  {
    value: 'ok',
    label: '200 · qq',
    lang: 'json',
    code: `{
  "statusCode": 200,
  "message": "success",
  "data": {
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
  },
  "meta": {
    "requestId": "muzhf0qg-ae999aed",
    "serverTime": "2026-10-08T11:57:31.241Z",
    "site": "Decamore API"
  }
}`,
  },
  {
    value: 'kugou',
    label: '200 · kugou',
    lang: 'json',
    code: `{
  "statusCode": 200,
  "message": "success",
  "data": {
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
  },
  "meta": {
    "requestId": "muzhf18o-162098ed",
    "serverTime": "2026-10-08T11:57:31.463Z",
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
  "message": "platform 只能是 qq、netease 或 kugou",
  "description": "platform：platform 只能是 qq、netease 或 kugou",
  "issues": [
    { "field": "platform", "message": "platform 只能是 qq、netease 或 kugou", "code": "invalid_type" }
  ],
  "data": null,
  "meta": {
    "timestamp": 1791460651482,
    "traceId": "muzi2zu3-c0b4ea22"
  }
}`,
  },
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
    { label: '限频', value: '120 次 / 分钟 / IP' },
  ],
  sections,
  requestPanes,
  responsePanes,
};

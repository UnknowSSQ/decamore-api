/** 接口文档内容；字段行为与数字均为 2026-10-11 实测（对上游跑了 20 余次取样） */
import { API } from '@/lib/api/endpoints';
import { NETEASE_ID_HINT } from '@/lib/zod/public.schema';
import { NETEASE_PLAYLISTS } from '@/constants/netease-playlists';
import { para, text } from '../fragments';
import { apiUrl } from '../url';
import {
  METHOD_NOT_SUPPORTED_ROW,
  RATE_LIMIT_ROW,
  SERVER_ERROR_SUGGESTION,
  UPSTREAM_TIMEOUT_ROW,
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

const path = API.publicApi.netease;
const url = apiUrl(path);

const poolCount = NETEASE_PLAYLISTS.length;
const poolNames = NETEASE_PLAYLISTS.map((one) => one.name).join('、');

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(...text('一次给一首歌和它下面的一条热评：先从歌单里随机抽一首，再从这首歌的热评里随机挑一条。')),
      envelopeOverview('是一条热评连同它的出处'),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '每次调用都是新的。',
        fragments: text(
          '响应头是 no-store，抽歌与选评论都发生在服务端，同一个 URL 连点两次不会给你同一条评论。',
        ),
      },
    ],
  },
  requestSection({ path }),
  paramsSection(
    [
      {
        name: 'id',
        type: 'integer',
        required: 'no',
        defaultValue: `内置 ${poolCount} 个官方榜单里随机挑一个`,
        description: [
          { type: 'code', value: '?id=' },
          { type: 'text', value: ' 是' },
          { type: 'code', value: '歌单 id' },
          { type: 'text', value: '（网易云歌单链接里那个数字），不是歌曲 id。内置池是 ' },
          { type: 'code', value: `${poolCount} 个官方榜单` },
          { type: 'text', value: `：${poolNames}。传进来的歌单要能取到曲目，否则 503。` },
        ],
      },
    ],
    {
      kind: 'callout',
      tone: 'warn',
      mark: '!',
      strong: '非法 id 不会被悄悄换成默认歌单。',
      fragments: text('?id=abc、?id=-5、?id=1.5 一律 422，回显写清楚是哪一条规则没过。'),
    },
  ),
  responseSection(
    '一首歌配一条热评。',
    [
      { name: 'songId', type: 'integer', description: text('抽中的歌曲 id，可直接拼进 music.163.com/song?id='), isChild: true },
      { name: 'song', type: 'string', description: text('歌名原文，含括号与外语标题'), isChild: true },
      { name: 'artist', type: 'string', description: text('第一歌手；一首歌有多位时上游给数组，这里取首位'), isChild: true },
      { name: 'cover', type: 'string', description: text('专辑封面直链，实测 108 次全是 https（域名在 p1/p2 之间换）'), isChild: true },
      { name: 'comment', type: 'string', description: text('评论正文，可能带「[红心]」这类表情占位符'), isChild: true },
      { name: 'nickname', type: 'string', description: text('评论者昵称'), isChild: true },
      { name: 'avatar', type: 'string', description: text('评论者头像直链，实测全是 http——https 页面里直接引用算混合内容'), isChild: true },
      { name: 'likedCount', type: 'integer', description: text('这条评论的点赞数；实测 12 到 86,036 都有'), isChild: true },
      {
        name: 'timeLabel',
        type: 'string',
        description: text('上游算好的时间串，形态不固定：实测见过「5天前」「06-20」「2024-01-01」三种'),
        isChild: true,
      },
      { name: 'playlistId', type: 'integer', description: text('本次抽歌用的歌单 id，不传 id 时告诉你随机落到了哪个'), isChild: true },
      {
        name: 'commentTotal',
        type: 'integer',
        description: text('这首歌的评论总数（不是热评条数）；实测 198 到 435,764'),
        isChild: true,
      },
    ],
    {
      kind: 'callout',
      tone: 'info',
      mark: 'i',
      strong: '热评池比你想的小。',
      fragments: text(
        '上游一次最多给 15 条热评——48 首随机取样里 40 首给满 15 条，其余是 1 到 13 条。随机是在这一池里随机，不是在全部评论里随机。',
      ),
    },
  ),
  headersSection({
    cache: text('响应每次现抽，不缓存；服务端只把歌单的曲目列表留 10 分钟，热评与歌曲详情不落缓存。'),
    cacheExample: 'no-store, max-age=0',
    traceId: 'mv3ga5ah-f5efbf399e09',
  }),
  errorsSection(
    [
      METHOD_NOT_SUPPORTED_ROW,
      validationRow({
        label: 'id 不合法',
        message: NETEASE_ID_HINT,
        field: 'id',
        suggestion: text('要么不传，走内置歌单池；要么传一个真实歌单 id。'),
      }),
      rateLimitedRow(text('一次请求要打三次上游，别把它当成可以轮询的榜单。')),
      {
        http: '503',
        statusCode: '503',
        label: '上游取不到',
        description: text('message 固定「网易云热评暂时取不到」，description 给具体原因（歌单没有可用曲目、连续换曲仍无热评、上游失败或在冷却）'),
        suggestion: SERVER_ERROR_SUGGESTION,
      },
    ],
    {
      hasValidation: true,
      callout: {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '没有 404，也不会回一条空评论。',
        fragments: text(
          '抽到没有热评的歌（纯音乐、新歌、下架歌很常见）就换一首再试，最多三次；三次都不中就 503，而不是给你 comment: ""。',
        ),
      },
    },
  ),
  limitsSection([
    RATE_LIMIT_ROW,
    {
      item: '歌单曲目缓存',
      limit: '10 分钟 / 每歌单',
      description: text('只缓存曲目 id 列表；歌曲详情与热评每次现取，所以同一首歌也可能连着给不同评论。'),
    },
    {
      item: '换曲重试',
      limit: '最多 3 首',
      description: text('热评为空时换一首再抽，三次不中直接 503。48 首随机取样里没遇到空热评，触发它的是纯音乐与下架歌。'),
    },
    {
      item: '外部依赖',
      limit: '网易云音乐三个接口',
      description: text('歌单详情、歌曲详情、评论列表，都是 PC 站的公开读接口，实测免 cookie、免签名。它们不属于网易的公开文档接口，改版会立刻体现为 503。'),
    },
    {
      item: '并发建议',
      limit: '≤ 1 QPS',
      description: text('一次调用等于三次上游请求，比榜单类接口更贵。'),
    },
    {
      item: '客户端建议',
      limit: '结果本地留 5 分钟',
      description: text('热评变化以小时计，抽到的一条在本地用一会儿完全没问题；接口本身不缓存，重复请求就是重复打上游。'),
    },
    UPSTREAM_TIMEOUT_ROW,
  ]),
  changelogSection([
    {
      date: '2026-10-11',
      version: 'v1.0',
      description: text(`网易云热评上线：内置 ${poolCount} 个官方榜单随机抽一首配一条热评，可选 id 指定歌单，曲目缓存 10 分钟、换曲重试上限三次。`),
    },
  ]),
];

const requestPanes: CodePaneData[] = [
  {
    value: 'curl',
    label: 'cURL',
    lang: 'bash',
    code: `# 不传 id：内置榜单池里随机挑一个
curl "${url}"

# 指定歌单
curl "${url}?id=3778678"`,
  },
  {
    value: 'js',
    label: 'JavaScript',
    lang: 'js',
    code: `const res = await fetch("${url}");
const { statusCode, message, data, meta } = await res.json();

if (statusCode === 200) {
  console.log("《" + data.song + "》" + data.artist, "· 歌单 " + data.playlistId);
  console.log(data.comment);
  console.log("—— " + data.nickname, data.likedCount + " 赞", data.timeLabel);
} else {
  console.error(statusCode, message);
}
console.log("requestId:", meta.requestId);`,
  },
  {
    value: 'py',
    label: 'Python',
    lang: 'py',
    code: `import requests

body = requests.get("${url}", params={"id": 3778678}).json()
data = body["data"]
if body["statusCode"] == 200:
    print(f"《{data['song']}》- {data['artist']}  评论总数 {data['commentTotal']}")
    print(data["comment"])
    print(f"—— {data['nickname']}（{data['likedCount']} 赞 · {data['timeLabel']}）")
else:
    print(body["statusCode"], body["message"])`,
  },
];

const responsePanes: CodePaneData[] = [
  successPane({
    label: '200 · 指定歌单',
    requestId: 'mv3ga5ah-f5efbf399e09',
    serverTime: '2026-10-11T06:36:48.766Z',
    dataJson: `{
    "songId": 1918576268,
    "playlistId": 3778678,
    "song": "红",
    "artist": "罗言",
    "cover": "https://p1.music.126.net/G-inyKjA-jO5MuOuV3g7Pg==/109951167027986653.jpg",
    "comment": "不幸福才会听红 幸福了也会听红 会想当初为什么不幸福 ",
    "nickname": "SAVN_7",
    "avatar": "http://p2.music.126.net/sLcSwZI0m11R5j5_uz-7iQ==/109951170303755695.jpg",
    "likedCount": 24270,
    "timeLabel": "2024-01-01",
    "commentTotal": 261792
  }`,
  }),
  successPane({
    label: '200 · 不传 id',
    value: 'random',
    requestId: 'mv3gazkt-6bdb5953ccf4',
    serverTime: '2026-10-11T06:37:28.203Z',
    dataJson: `{
    "songId": 3395393730,
    "playlistId": 71385702,
    "song": "Brand New Sky (新世界的天空)",
    "artist": "鸣潮先约电台",
    "cover": "https://p2.music.126.net/NbbrRcmT1EYggFnvom016Q==/109951173417603934.jpg",
    "comment": "小爱，我爱你，我永远为你感到骄傲，你简直就是我的全世界……（这条 218 字，评论长短差得很多）",
    "nickname": "无为无相无念",
    "avatar": "http://p1.music.126.net/5FHvk99TtMjJTdhuf2Qlkg==/109951172733958499.jpg",
    "likedCount": 156,
    "timeLabel": "06-20",
    "commentTotal": 1264
  }`,
  }),
  failurePane({
    statusCode: 422,
    message: NETEASE_ID_HINT,
    requestId: 'mv3gazhx-25d80449c69e',
    serverTime: '2026-10-11T06:37:27.477Z',
    description: `id：${NETEASE_ID_HINT}`,
    issues: [{ field: 'id', message: NETEASE_ID_HINT, code: 'invalid_type' }],
  }),
  failurePane({
    statusCode: 503,
    message: '网易云热评暂时取不到',
    value: 'unavailable',
    requestId: 'mv3gazjb-25628ae9d7be',
    serverTime: '2026-10-11T06:37:27.527Z',
    description: '歌单 999999999999 没有可用曲目',
  }),
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const neteaseDoc: AuthoredApiDoc = {
  eyebrow: 'Content API · v1',
  lede: '随机一首歌，和它下面的一条热评。',
  facts: [`内置 ${poolCount} 个官方榜单，随机抽一首`, '热评每次现取，响应 no-store'],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-11' },
    { label: '内置歌单', value: `${poolCount} 个官方榜单（可用 id 指定）` },
    { label: '服务端缓存', value: '曲目 10 分钟；评论不缓存' },
    { label: '限频', value: rateLimitText },
  ],
  sections,
  requestPanes,
  responsePanes,
};

/** 接口文档内容；字段行为与数字均为 2026-10-11 实测 */
import { API } from '@/lib/api/endpoints';
import { WARNING_LEVEL_HINT, WARNING_REGION_HINT, WARNING_TYPE_HINT } from '@/lib/zod/public.schema';
import { WARNING_LEVELS, WARNING_REGIONS, WARNING_SIGNAL_TYPES } from '@/constants/warning-signals';
import { para, text } from '../fragments';
import { apiUrl } from '../url';
import {
  CACHE_IMPL_ROW,
  METHOD_NOT_SUPPORTED_ROW,
  RATE_LIMIT_ROW,
  SERVER_ERROR_SUGGESTION,
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

const path = API.publicApi.warning;
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(...text('气象台发红橙黄蓝预警时，信息散在官网的列表页里。这个接口把此刻在架的全部预警取回来，给类型、等级、发布单位、签发时刻和原页链接，可按三者任一筛。')),
      envelopeOverview('是此刻在架的预警信号清单'),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '这是气象台发布的预警信号，不是实况天气。',
        fragments: text('预警是「未来一段时间要注意什么」，温度、风力那些此刻值在 /api/v1/weather。两者上游不同，别混着用。'),
      },
    ],
  },
  requestSection({ path }),
  paramsSection([
    {
      name: 'type',
      type: 'string',
      required: 'no',
      defaultValue: '不筛',
      description: [
        { type: 'text', value: '预警类型，十三种之一（' },
        { type: 'code', value: WARNING_SIGNAL_TYPES.map((one) => one.key + '＝' + one.value).join('、') },
        { type: 'text', value: '）。这十三项是上游筛选器给的口径；实测 668 条里有 39 条的类型不在其中（雷雨大风、地质灾害、山洪灾害、森林火险、海上大风…），那些条目照样返回，但 signalType 为 null，也无法用 type 筛。' },
      ],
    },
    {
      name: 'level',
      type: 'string',
      required: 'no',
      defaultValue: '不筛',
      description: [
        { type: 'text', value: '等级，四种之一（' },
        { type: 'code', value: WARNING_LEVELS.map((one) => one.key).join(' / ') },
        { type: 'text', value: '）。按标题结尾的颜色取，实测 668 条全部解析得出（机构写「气象分局」的也曾漏，锚已经放宽到「气象台|分局」）。' },
      ],
    },
    {
      name: 'region',
      type: 'string',
      required: 'no',
      defaultValue: '不筛',
      description: [
        { type: 'text', value: '省级拼音键，' },
        { type: 'code', value: `${WARNING_REGIONS.length} 个` },
        { type: 'text', value: '（beijing、guangdong、shaanxi…）。按标题前缀归集，实测全部条目都能归到一个省。山西与陕西同拼音，这里陕西多一个 a。' },
      ],
    },
    {
      name: 'limit',
      type: 'integer',
      required: 'no',
      defaultValue: '全量',
      description: text('只取前 N 条（1–100）。不传就给命中筛选的全部条目。'),
    },
  ]),
  responseSection(
    '一份预警清单，带在架总数与四色计数。',
    [
      { name: 'updatedAt', type: 'string', description: text('这版数据的服务端抓取时刻，ISO。'), isChild: true },
      cachedRow('60 秒'),
      { name: 'upstreamTotal', type: 'integer', description: text('上游给回的在架总数，不受本次筛选影响。这个量随天气起伏：同日 21:18 实测 330 条，22:05 涨到 668 条（傍晚一批大雾预警）。'), isChild: true },
      { name: 'truncated', type: 'boolean', description: text('true 表示在架条目多于五页（每页 200，即 1,000 条）没全取回，或者中间有页取失败；正常范围里是 false。'), isChild: true },
      { name: 'matched', type: 'integer', description: text('本次筛选命中的条数，在 limit 截断之前。'), isChild: true },
      { name: 'levelCount', type: 'object', description: text('命中条目里四色各多少，键是 blue / yellow / orange / red。由本站数出来，不是上游的统计。'), isChild: true },
      { name: 'items', type: 'array', description: text('预警数组，按签发时刻从新到旧。'), isChild: true },
      {
        name: 'alertId',
        type: 'string',
        description: text('上游的预警 id，形如 15072541600000_20261011205245：前段是区划码，后段就是签发时刻。'),
        isChild: true,
      },
      { name: 'title', type: 'string', description: text('标题原文，含发布单位与「预警信号」。'), isChild: true },
      { name: 'issuer', type: 'string', description: text('发布单位全称（去掉「气象台发布」那段），如「内蒙古自治区呼伦贝尔市陈巴尔虎旗」。联合发布时整串照抄。'), isChild: true },
      { name: 'region', type: 'string | null', description: text('归到的省级拼音键，与 region 参数同一套取值。'), isChild: true },
      { name: 'signalType', type: 'string | null', description: text('类型键，解析不出十三类之外时为 null。'), isChild: true },
      { name: 'level', type: 'string | null', description: text('等级键，按结尾颜色取。'), isChild: true },
      { name: 'icon', type: 'string', description: text('上游的等级图标直链，随类型与等级变（实测 image.nmc.cn/assets/img/alarm/p0007004.png）。'), isChild: true },
      { name: 'url', type: 'string', description: text('该条预警在官网的详情页，上游给的是相对路径，这里补成绝对直链。'), isChild: true },
      { name: 'issuedAt', type: 'string | null', description: text('签发时刻，ISO。上游只给到分钟（20:52），所以秒恒为 0，换算是按东八区减 8 小时。'), isChild: true },
    ],
  ),
  headersSection({
    cache: text('接口响应与服务端缓存都是 60 秒；CORS 来源可变，所以 HTTP 层是 private。'),
    cacheExample: 'private, max-age=60, stale-while-revalidate=30',
    traceId: 'mv3umc7q-c5b45b43d852',
  }),
  errorsSection(
    [
      METHOD_NOT_SUPPORTED_ROW,
      validationRow({
        label: 'type 不合法',
        message: WARNING_TYPE_HINT,
        field: 'type',
        suggestion: text('十三种类型键之一，或者不传。'),
      }),
      validationRow({
        label: 'level 不合法',
        message: WARNING_LEVEL_HINT,
        field: 'level',
        suggestion: text('blue、yellow、orange、red 四个之一。'),
      }),
      validationRow({
        label: 'region 不合法',
        message: WARNING_REGION_HINT,
        field: 'region',
        suggestion: text('用拼音键，别写汉字也别写英文全称。'),
      }),
      rateLimitedRow(text('预警不是一分钟变几十轮的东西，60 秒内反复请求拿到的还是同一份缓存。')),
      {
        http: '503',
        statusCode: '503',
        label: '预警取不到',
        description: text('只有需要回源时才可能出现（上游连不上、非 200、或列表结构读不出来），message 固定「气象预警暂时取不到」'),
        suggestion: SERVER_ERROR_SUGGESTION,
      },
    ],
    {
      hasValidation: true,
      callout: {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '筛不出结果不是错误。',
        fragments: text('没有红色预警时 level=red 返回 200、items 是空数组、matched 为 0，不会给你 404。空串（?type=）等价于不传。'),
      },
    },
  ),
  limitsSection([
    RATE_LIMIT_ROW,
    {
      item: '清单缓存',
      limit: '60 秒 / 全量一份',
      description: text('缓存的是「此刻在架的全部预警」这一份（实测 668 条、全量响应体 221,187 字节），筛选与 limit 都在缓存之外做，所以换一套筛选条件不会多打上游一次。'),
    },
    CACHE_IMPL_ROW,
    {
      item: '取回页数',
      limit: '每页 200 条，最多 5 页并行',
      description: text('上游按 pageSize 如实给数（实测 pageSize=200 一页给 200 条、pageSize=500 一页给 500 条封顶）。本站先取第一页拿到 totalPage，剩下的页一次并发取完——某一页失败不整体作废，已取到的照发、truncated 标 true。'),
    },
    {
      item: '类型口径',
      limit: '只认官方筛选器的十三类',
      description: text('上游页面的类型下拉就是这十三项，参数面跟着它走。实测 330 条里有 42 条（雷雨大风、地质灾害、山洪灾害、海上雷雨大风、雷暴大风、道路冰雪、森林火险、其它气象灾害）在这十三类之外，它们 signalType 为 null、无法用 type 筛，但等级与区域都准。'),
    },
    {
      item: '外部依赖',
      limit: '中央气象台 www.nmc.cn',
      description: text('实测免 key、境内直连，但耗时很不平：一页 200 条要 1.6–3.8 秒，一页 500 条要 5.9 秒，所以上游宁可用小页并行。668 条（四页）冷取实测 2.7–5.5 秒，命中缓存 12ms。单页 8 秒超时按失败处理（503 并进 15 秒冷却）。它站内的 rest/findAlarm 不是公开文档接口，改版会直接体现为 503 或字段读空。'),
    },
    UPSTREAM_TIMEOUT_ROW,
  ]),
  changelogSection([
    {
      date: '2026-10-11',
      version: 'v1.0',
      description: text('气象预警上线：中央气象台在架预警全量回源（实测 330 条，单页取完），类型 / 等级 / 省份三个筛选在本地做，服务端缓存 60 秒，签发时刻按东八区换 ISO。'),
    },
    {
      date: '2026-10-11',
      version: 'v1.1',
      description: text('冷取从 11.3 秒降到 2.7–5.5 秒：在架量傍晚涨到 668 条后，原先「单页 500、最多三页」变成两次串行回源，改成每页 200、剩余页一次并发取；机构锚放宽到「气象台|分局」，两条写「气象分局」的等级不再丢。'),
    },
  ]),
];

const requestPanes: CodePaneData[] = [
  {
    value: 'curl',
    label: 'cURL',
    lang: 'bash',
    code: `# 此刻全部在架预警
curl "${url}"

# 只看红色与橙色
curl "${url}?level=red"
curl "${url}?level=orange&limit=10"

# 某省的某种类型
curl "${url}?region=liaoning&type=fog"`,
  },
  {
    value: 'js',
    label: 'JavaScript',
    lang: 'js',
    code: `const params = new URLSearchParams({ region: "liaoning", type: "fog" });
const res = await fetch("${url}?" + params);
const { statusCode, message, data } = await res.json();

if (statusCode === 200) {
  console.log("在架", data.upstreamTotal, "命中", data.matched, data.levelCount);
  for (const one of data.items) console.log(one.level, one.title, one.issuedAt);
} else {
  console.error(statusCode, message);
}`,
  },
  {
    value: 'py',
    label: 'Python',
    lang: 'py',
    code: `import requests

body = requests.get("${url}", params={"level": "red"}).json()
data = body["data"]
if body["statusCode"] == 200:
    print("在架", data["upstreamTotal"], "命中", data["matched"])
    for one in data["items"]:
        print(one["level"], one["title"])
else:
    print(body["statusCode"], body["message"])`,
  },
];

const responsePanes: CodePaneData[] = [
  successPane({
    label: '200 · 命中两条',
    requestId: 'mv3umc7q-c5b45b43d852',
    serverTime: '2026-10-11T13:18:11.798Z',
    dataJson: `{
    "updatedAt": "2026-10-11T13:18:03.208Z",
    "cached": true,
    "upstreamTotal": 330,
    "truncated": false,
    "matched": 330,
    "levelCount": { "blue": 120, "yellow": 141, "orange": 65, "red": 4 },
    "items": [
      {
        "alertId": "32132241600000_20261011211224",
        "title": "江苏省宿迁市沭阳县气象台发布大雾黄色预警信号",
        "issuer": "江苏省宿迁市沭阳县",
        "region": "jiangsu",
        "signalType": "fog",
        "level": "yellow",
        "icon": "https://image.nmc.cn/assets/img/alarm/p0005003.png",
        "url": "https://www.nmc.cn/publish/alarm/32132241600000_20261011211224.html",
        "issuedAt": "2026-10-11T13:12:00.000Z"
      },
      {
        "alertId": "61011641600000_20261011211023",
        "title": "陕西省西安市长安区气象台发布大雾黄色预警信号",
        "issuer": "陕西省西安市长安区",
        "region": "shaanxi",
        "signalType": "fog",
        "level": "yellow",
        "icon": "https://image.nmc.cn/assets/img/alarm/p0005003.png",
        "url": "https://www.nmc.cn/publish/alarm/61011641600000_20261011211023.html",
        "issuedAt": "2026-10-11T13:10:00.000Z"
      }
      // … 这是 limit=2 的样子：matched 330 是命中数，items 只有两条
    ]
  }`,
  }),
  failurePane({
    label: '422 · type 不在十三类里',
    statusCode: 422,
    message: WARNING_TYPE_HINT,
    requestId: 'mv3u4kwm-0c937fb4ac4e',
    serverTime: '2026-10-11T13:04:23.255Z',
    description: `type：${WARNING_TYPE_HINT}`,
    issues: [{ field: 'type', message: WARNING_TYPE_HINT, code: 'custom' }],
  }),
  failurePane({
    label: '422 · level 不合法',
    statusCode: 422,
    value: 'level',
    message: WARNING_LEVEL_HINT,
    requestId: 'mv3u4l4b-7868546c3574',
    serverTime: '2026-10-11T13:04:23.531Z',
    description: `level：${WARNING_LEVEL_HINT}`,
    issues: [{ field: 'level', message: WARNING_LEVEL_HINT, code: 'custom' }],
  }),
  failurePane({
    label: '422 · region 不在表里',
    statusCode: 422,
    value: 'region',
    message: WARNING_REGION_HINT,
    requestId: 'mv3u4lc3-d03ba984156f',
    serverTime: '2026-10-11T13:04:23.812Z',
    description: `region：${WARNING_REGION_HINT}`,
    issues: [{ field: 'region', message: WARNING_REGION_HINT, code: 'custom' }],
  }),
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const warningDoc: AuthoredApiDoc = {
  eyebrow: 'Data API · v1',
  lede: '此刻在架的气象预警信号，按类型、等级、省份筛',
  facts: [
    '实测在架 330–668 条随天气起伏，四色计数与命中数分开给',
    `类型 ${WARNING_SIGNAL_TYPES.length} 类、等级 4 档、区域 ${WARNING_REGIONS.length} 个`,
  ],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-11' },
    { label: '参数', value: 'type · level · region · limit，都可省' },
    { label: '服务端缓存', value: '60 秒 / 全量一份' },
    { label: '限频', value: rateLimitText },
  ],
  sections,
  requestPanes,
  responsePanes,
};

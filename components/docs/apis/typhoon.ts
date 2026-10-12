/** 接口文档内容；字段行为与数字均为 2026-10-11 实测（列表、小熊 2629 的 51 个时次与四条错误路径） */
import { API } from '@/lib/api/endpoints';
import { TYPHOON_ID_HINT } from '@/lib/zod/public.schema';
import { para, text } from '../fragments';
import { apiUrl } from '../url';
import {
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

const path = API.publicApi.typhoon;
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(
        ...text(
          '台风季想知道现在哪一个在架、它这会儿在哪儿、往哪个方向走、强到什么程度，这里一次给全：不传参数拿编号列表，拿着列表里的 id 再要一条路径。',
        ),
      ),
      envelopeOverview('要么是一份编号列表，要么是某个台风逐 3 小时的路径点'),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '传不传 id 是两种形状。',
        fragments: text(
          '不传 id 时 data 里是 active 与 list 两个数组；传了 id 就是 id / name / cname / code / active / points。对不上就当成两个接口看，别指望一套解析通吃。',
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
        defaultValue: '不传，返回编号列表',
        description: [
          { type: 'text', value: '台风的内部 id，' },
          { type: 'code', value: '?id=' },
          { type: 'text', value: ' 就取这一条的路径。它不是编号——编号是 2629 这种，id 是上游给的大整数，实测 3346033。先用不带参数的请求拿列表。' },
        ],
      },
    ],
    {
      kind: 'callout',
      tone: 'warn',
      mark: '!',
      strong: 'id 不存在不会给你 404。',
      fragments: text(
        '?id=1 与 ?id=999999999999 都是 503，description 写「上游返回 HTTP 404」——上游查不到就是查不到，我们不去编一个空路径给你。?id=-3、?id=1.5 这种是 422。',
      ),
    },
  ),
  responseSection(
    '一份编号列表，或一个台风的路径。',
    [
      { name: 'active', type: 'array', description: text('当前在架的台风。实测 1 条（2629 小熊）；没有台风在架时是空数组，不是 null'), isChild: true },
      { name: 'list', type: 'array', description: text('上游列表里的全部编号，实测 32 条，按编号从新到旧'), isChild: true },
      { name: 'list[].id', type: 'integer', description: text('取路径就传它'), isChild: true },
      { name: 'list[].code', type: 'string', description: text('编号。实测两种长度：命名台风 4 位（2629），未命名热带低压 8 位（20260027）'), isChild: true },
      { name: 'list[].name', type: 'string', description: text('国际命名；没命名的上游给字面量 nameless，实测 32 条里有 3 条'), isChild: true },
      { name: 'list[].cname', type: 'string', description: text('中文名。上游原串带换行（「小熊\\n」），这里去掉了两头空白'), isChild: true },
      { name: 'list[].meaning', type: 'string | null', description: text('这个名字的含义（「一种鹰」）。实测 4 条为 null'), isChild: true },
      { name: 'list[].active', type: 'boolean', description: text('与顶层 active 同一判据：start 为真'), isChild: true },
      cachedRow('10 分钟'),
      { name: 'points', type: 'array', description: text('传 id 时才有。实测小熊 51 个时次，3 小时一个，从起报到最新观测'), isChild: true },
      { name: 'points[].time', type: 'string', description: text('该时次，ISO。实测与上游那个 12 位标签逐位一致，标签本身不带时区标记'), isChild: true },
      { name: 'points[].strength', type: 'string', description: text('强度原文，大小写不统一：实测见过 TS / STS / TY / STY / SuperTY'), isChild: true },
      { name: 'points[].strengthLabel', type: 'string | null', description: text('中文档名（超强台风）。认不出的强度原样给 null，不猜'), isChild: true },
      { name: 'points[].lon', type: 'number', description: text('中心经度，东经。实测 147.8 到 168.1'), isChild: true },
      { name: 'points[].lat', type: 'number', description: text('中心纬度，北纬。实测 10.4 到 25.3'), isChild: true },
      { name: 'points[].pressure', type: 'number | null', description: text('中心气压，百帕。实测 925 到 998，越低越强'), isChild: true },
      { name: 'points[].windSpeed', type: 'number | null', description: text('最大风速，米 / 秒。实测 18 到 58'), isChild: true },
      { name: 'points[].direction', type: 'string | null', description: text('移动方向。实测只有五个值：NNW / N / NW / WNW / W'), isChild: true },
      { name: 'points[].moveSpeed', type: 'number | null', description: text('移动速度，公里 / 小时'), isChild: true },
    ],
    {
      kind: 'callout',
      tone: 'info',
      mark: 'i',
      strong: '路径点里没有预报。',
      fragments: text(
        '上游那份明细其实带着各台的预报点，但预报口径按机构而异、字段是嵌套数组，我们只取已经观测到的时次。要预报请去气象台页面看，我们不去猜它的算法。',
      ),
    },
  ),
  headersSection({
    cache: text('列表与路径各缓存 10 分钟，响应头按同一时长给 max-age；上游本身是 3 小时一个时次，再快也没有更新的数据。'),
    cacheExample: 'private, max-age=600, stale-while-revalidate=300',
    traceId: 'mv3l51ep-dae3c8501cf7',
  }),
  errorsSection(
    [
      METHOD_NOT_SUPPORTED_ROW,
      validationRow({
        label: 'id 不是正整数',
        message: TYPHOON_ID_HINT,
        field: 'id',
        suggestion: text('先不带参数拿一次列表，用 list[].id 来要路径。'),
      }),
      rateLimitedRow(text('按 Retry-After 退避；列表与路径各自缓存 10 分钟，同一份上游数据服务一批请求。')),
      {
        http: '503',
        statusCode: '503',
        label: '上游取不到',
        description: text('message 固定「台风信息暂时取不到」，description 给具体原因：上游 HTTP 404（id 不存在）、非 200、或响应里没有可用条目'),
        suggestion: SERVER_ERROR_SUGGESTION,
      },
    ],
    {
      hasValidation: true,
      callout: {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '没有 404 这一档。',
        fragments: text('查无此台风是 503 而不是 404——这个接口没有「资源不存在」的概念，只有「上游这次没给数据」。'),
      },
    },
  ),
  limitsSection([
    RATE_LIMIT_ROW,
    {
      item: '服务端缓存',
      limit: '10 分钟 / 每 id',
      description: text('列表全局一份，路径按 id 各存一份；并发首请求合并成一次上游调用。'),
    },
    {
      item: '更新节奏',
      limit: '3 小时一个时次',
      description: text('上游按 00 / 03 / 06 … 整点出观测，缓存 10 分钟只是为了让新时次尽快可见，别把它当实时流。'),
    },
    {
      item: '外部依赖',
      limit: '中央气象台台风网两个接口',
      description: text('list_default 给编号列表，view_<id> 给路径，都是 JSONP、免 cookie 免签名。它们不是对外承诺的稳定接口，改版会直接体现为 503。'),
    },
    {
      item: '并发建议',
      limit: '≤ 2 QPS',
      description: text('想要整张路径图，先把列表取回来缓存住，别对每个 id 各打一轮。'),
    },
    UPSTREAM_TIMEOUT_ROW,
  ]),
  changelogSection([
    {
      date: '2026-10-11',
      version: 'v1.0',
      description: text('台风接口上线：编号列表与逐 3 小时路径点，强度按实测五档给中文，服务端缓存 10 分钟。'),
    },
  ]),
];

const requestPanes: CodePaneData[] = [
  {
    value: 'curl',
    label: 'cURL',
    lang: 'bash',
    code: `# 编号列表：看现在哪个台风在架
curl "${url}"

# 拿列表里某个 id 要路径
curl "${url}?id=3346033"`,
  },
  {
    value: 'js',
    label: 'JavaScript',
    lang: 'js',
    code: `const list = await (await fetch("${url}")).json();
const live = list.data.active[0];
console.log(live.cname, live.name, live.code);

const track = await (await fetch("${url}?id=" + live.id)).json();
const last = track.data.points.at(-1);
console.log(last.time, last.strengthLabel, last.lon + "°E " + last.lat + "°N", last.pressure + "hPa", last.windSpeed + "m/s");
console.log("requestId:", track.data.cached ? "（服务端缓存）" : "（现取）", track.meta.requestId);`,
  },
  {
    value: 'py',
    label: 'Python',
    lang: 'py',
    code: `import requests

live = requests.get("${url}").json()["data"]["active"]
for one in live:
    print(one["code"], one["cname"], one["name"], one["meaning"])

track = requests.get("${url}", params={"id": live[0]["id"]}).json()["data"]
last = track["points"][-1]
print(f'{last["time"]}  {last["strengthLabel"]}  {last["lon"]}E {last["lat"]}N  '
      f'{last["pressure"]}hPa  {last["windSpeed"]}m/s  向{last["direction"]} {last["moveSpeed"]}km/h')`,
  },
];

const responsePanes: CodePaneData[] = [
  successPane({
    label: '200 · 编号列表',
    requestId: 'mv3l51ep-dae3c8501cf7',
    serverTime: '2026-10-11T08:52:48.097Z',
    dataJson: `{
    "active": [
      {
        "id": 3346033,
        "code": "2629",
        "name": "KOGUMA",
        "cname": "小熊",
        "meaning": "小熊星座",
        "active": true
      }
    ],
    "list": [
      { "id": 3346033, "code": "2629", "name": "KOGUMA", "cname": "小熊", "meaning": "小熊星座", "active": true },
      { "id": 3346168, "code": "2628", "name": "NOLO", "cname": "诺洛", "meaning": null, "active": false },
      { "id": 3341981, "code": "2627", "name": "CHOI-WAN", "cname": "彩云", "meaning": "天上的云彩", "active": false }
      // … 实测共 32 条，按编号从新到旧
    ],
    "cached": false
  }`,
  }),
  successPane({
    label: '200 · 路径（?id=）',
    value: 'track',
    requestId: 'mv3l51ez-3bcffb325420',
    serverTime: '2026-10-11T08:52:48.635Z',
    dataJson: `{
    "id": 3346033,
    "name": "KOGUMA",
    "cname": "小熊",
    "code": "2629",
    "active": true,
    "points": [
      {
        "time": "2026-10-05T00:00:00.000Z",
        "strength": "TS",
        "strengthLabel": "热带风暴",
        "lon": 168.1,
        "lat": 10.4,
        "pressure": 998,
        "windSpeed": 18,
        "direction": "NNW",
        "moveSpeed": 8
      },
      {
        "time": "2026-10-11T06:00:00.000Z",
        "strength": "SuperTY",
        "strengthLabel": "超强台风",
        "lon": 147.8,
        "lat": 25.3,
        "pressure": 930,
        "windSpeed": 55,
        "direction": "NNW",
        "moveSpeed": 20
      }
      // … 实测共 51 个时次，这里首末两条
    ],
    "cached": true
  }`,
  }),
  failurePane({
    statusCode: 422,
    message: TYPHOON_ID_HINT,
    requestId: 'mv3l523u-aafa57abf25f',
    serverTime: '2026-10-11T08:52:49.003Z',
    description: `id：${TYPHOON_ID_HINT}`,
    issues: [{ field: 'id', message: TYPHOON_ID_HINT, code: 'invalid_type' }],
  }),
  failurePane({
    statusCode: 503,
    message: '台风信息暂时取不到',
    value: 'unavailable',
    requestId: 'mv3lapfk-9e9b5835f516',
    serverTime: '2026-10-11T08:57:12.735Z',
    description: '上游返回 HTTP 404',
  }),
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const typhoonDoc: AuthoredApiDoc = {
  eyebrow: 'Data API · v1',
  lede: '现在哪个台风在架，它这会儿在哪、往哪儿走、强到什么档。',
  facts: ['列表 32 个编号，路径每 3 小时一个时次', '强度五档给中文，认不出的给 null'],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-11' },
    { label: '数据来源', value: '中央气象台台风网（免 key）' },
    { label: '服务端缓存', value: '10 分钟（列表一份、每个 id 一份）' },
    { label: '限频', value: rateLimitText },
  ],
  sections,
  requestPanes,
  responsePanes,
};

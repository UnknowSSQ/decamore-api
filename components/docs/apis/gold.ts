/** 接口文档内容；字段行为与数字均为 2026-10-11 实测 */
import { API } from '@/lib/api/endpoints';
import { GOLD_CONTRACT_HINT } from '@/lib/zod/public.schema';
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

const path = API.publicApi.gold;
const url = apiUrl(path);

const contractEnum = GOLD_CONTRACT_HINT;

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(...text('要看上金所今天的黄金、白银行情，本来得登官网翻分时图。这个接口把某个合约当日的分时走势压成一个汇总对象，直接给出最新价和开、高、低。')),
      envelopeOverview('是某个合约的当日行情汇总'),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '这是交易所行情，不是金店零售价。',
        fragments: text('给的是上海黄金交易所的挂牌价，和周大福、老庙那种金饰零售价不是一回事；伦敦金、COMEX 这类国际金价在别的上游，本接口不提供。'),
      },
    ],
  },
  requestSection({ path }),
  paramsSection([
    {
      name: 'contract',
      type: 'string',
      required: 'no',
      defaultValue: 'Au99.99',
      description: [
        { type: 'code', value: '?contract=' },
        { type: 'text', value: ' 是上金所的合约代码，不传默认 ' },
        { type: 'code', value: 'Au99.99' },
        { type: 'text', value: '；六个取值：' },
        { type: 'code', value: 'Au99.99 / Au99.95 / Au100g / iAu99.99 / Au(T+D) / Ag99.99' },
        { type: 'text', value: '。传进这六个之外的代码返回 422。' },
      ],
    },
  ]),
  responseSection(
    '某个合约的当日行情汇总。',
    [
      { name: 'contract', type: 'string', description: text('命中的合约代码；不传时这里是 Au99.99。'), isChild: true },
      { name: 'unit', type: 'string', description: text('计价单位。黄金系列是元/克，Ag99.99 是元/千克。'), isChild: true },
      { name: 'price', type: 'number', description: text('最新价，取分时序列的最后一个点。'), isChild: true },
      { name: 'open', type: 'number', description: text('今日开盘，取分时序列的第一个点。'), isChild: true },
      { name: 'high', type: 'number', description: text('当日最高，分时序列里的最大值。'), isChild: true },
      { name: 'low', type: 'number', description: text('当日最低，分时序列里的最小值。'), isChild: true },
      {
        name: 'points',
        type: 'integer',
        description: text('当日分时点数，实测 782；上游从 20:00 起按固定间隔铺满，含前一晚的夜盘。'),
        isChild: true,
      },
      {
        name: 'asOf',
        type: 'string',
        description: text('这份行情截至的时刻，HH:MM 的北京时间、不带日期。实测见过 16:49、16:50、16:52。'),
        isChild: true,
      },
      {
        name: 'updatedAt',
        type: 'string | null',
        description: text('上游 delaystr 转成的 ISO 时间。实测它比 asOf 晚——这是这份数据生成的时刻，不是最新成交价时间。'),
        isChild: true,
      },
      cachedRow('60 秒'),
    ],
  ),
  headersSection({
    cache: text('接口响应按 60 秒下发 HTTP 缓存，服务端同一合约也缓存 60 秒，同窗口内浏览器可直接复用；因为 CORS 来源可变，所以是 private。'),
    cacheExample: 'private, max-age=60, stale-while-revalidate=30',
    traceId: 'mv3l51y9-16f6737c15f0',
  }),
  errorsSection(
    [
      METHOD_NOT_SUPPORTED_ROW,
      validationRow({
        label: 'contract 不合法',
        message: contractEnum,
        field: 'contract',
        suggestion: text('六个代码里挑一个，或者干脆不传，走默认的 Au99.99。'),
      }),
      rateLimitedRow(text('行情以分钟计，60 秒内轮询拿到的还是同一份缓存，更快的请求只会白耗配额。')),
      {
        http: '503',
        statusCode: '503',
        label: '行情取不到',
        description: text('只有需要回源取行情时才可能出现（上游非 200、分时序列为空、或上游把合约换成别的代码），命中缓存时不会触发；message 固定「金价暂时取不到」'),
        suggestion: SERVER_ERROR_SUGGESTION,
      },
    ],
    {
      hasValidation: true,
      callout: {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '没有 400 / 404。',
        fragments: text('唯一的参数错误是 contract 不在六个取值里带来的 422；行情取不到直接 503，不存在查无此合约、或返回 price: 0 的分支。'),
      },
    },
  ),
  limitsSection([
    RATE_LIMIT_ROW,
    {
      item: '行情缓存',
      limit: '60 秒 / 每合约',
      description: text('六个合约各缓存一份，命中时 cached=true；并发的首个请求合并成一次上游调用。'),
    },
    CACHE_IMPL_ROW,
    {
      item: '价格换算',
      limit: '由分时序列算出',
      description: text('上游只给 times（分时时刻）与 data（价格）两条等长数组，没有独立的开盘 / 最高 / 最低 / 昨收字段。open 取分时首点、price 取末点、high/low 取序列最大最小；昨收上游不给，也不去别处拼。'),
    },
    {
      item: '合约编码',
      limit: '+ 会被还原',
      description: text('六个取值里只有 Au(T+D) 带 +。查询串里裸写时，+ 会按表单编码被解成空格；六个合约名都不含空格，服务端会把空格还原成 + 再比对，实测裸写 Au(T+D) 与正确编码的 Au(T%2BD) 都返回 200。用 URLSearchParams 或 requests 的 params= 传参会自动编成 %2B，不用管。'),
    },
    {
      item: '外部依赖',
      limit: '上海黄金交易所官网',
      description: text('它站内的分时行情接口，实测免 cookie、免签名。不属于上金所的公开文档接口，官网改版会直接体现为 503。'),
    },
    UPSTREAM_TIMEOUT_ROW,
  ]),
  changelogSection([
    {
      date: '2026-10-11',
      version: 'v1.0',
      description: text('金价上线：上海黄金交易所六个合约（Au99.99 / Au99.95 / Au100g / iAu99.99 / Au(T+D) / Ag99.99）的当日分时行情，最新价与开高低由分时序列算出，服务端按合约缓存 60 秒。'),
    },
  ]),
];

const requestPanes: CodePaneData[] = [
  {
    value: 'curl',
    label: 'cURL',
    lang: 'bash',
    code: `# 不传 contract：默认 Au99.99
curl "${url}"

# 指定某个黄金合约
curl "${url}?contract=Au99.95"

# 白银按元/千克计价
curl "${url}?contract=Ag99.99"`,
  },
  {
    value: 'js',
    label: 'JavaScript',
    lang: 'js',
    code: `const params = new URLSearchParams({ contract: 'Au(T+D)' });
const res = await fetch("${url}?" + params);
const { statusCode, message, data, meta } = await res.json();

if (statusCode === 200) {
  console.log(data.price, data.unit, "截至", data.asOf);
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

# params= 会把 + 自动编成 %2B，不用自己处理
body = requests.get("${url}", params={"contract": "Au(T+D)"}).json()
data = body["data"]
if body["statusCode"] == 200:
    print(data["contract"], data["price"], data["unit"], "截至", data["asOf"])
else:
    print(body["statusCode"], body["message"])`,
  },
];

const responsePanes: CodePaneData[] = [
  successPane({
    label: '200 · Au99.99',
    requestId: 'mv3l51y9-16f6737c15f0',
    serverTime: '2026-10-11T08:52:48.801Z',
    dataJson: `{
    "contract": "Au99.99",
    "unit": "元/克",
    "price": 898,
    "open": 904.48,
    "high": 907,
    "low": 898,
    "points": 782,
    "asOf": "16:49",
    "updatedAt": "2026-10-11T18:29:53.000Z",
    "cached": true
  }`,
  }),
  successPane({
    label: '200 · Ag99.99',
    value: 'ag',
    requestId: 'mv3l51yb-e97eec5d8ca6',
    serverTime: '2026-10-11T08:52:48.997Z',
    dataJson: `{
    "contract": "Ag99.99",
    "unit": "元/千克",
    "price": 14708,
    "open": 14710,
    "high": 14710,
    "low": 14708,
    "points": 782,
    "asOf": "16:50",
    "updatedAt": "2026-10-11T18:29:53.000Z",
    "cached": false
  }`,
  }),
  failurePane({
    label: '422 · contract 不在六个取值里',
    statusCode: 422,
    message: contractEnum,
    requestId: 'mv3l523z-48302270f1a2',
    serverTime: '2026-10-11T08:52:49.007Z',
    description: 'contract：' + contractEnum,
    issues: [{ field: 'contract', message: contractEnum, code: 'custom' }],
  }),
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const goldDoc: AuthoredApiDoc = {
  eyebrow: 'Data API · v1',
  lede: '上金所当天某个合约的实时行情汇总',
  facts: ['六个合约，一个可选参数', '开 / 高 / 低 / 最新价由分时序列算出'],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-11' },
    { label: '合约', value: '六个（Au99.99 / Au99.95 / Au100g / iAu99.99 / Au(T+D) / Ag99.99）' },
    { label: '服务端缓存', value: '60 秒 / 每合约' },
    { label: '限频', value: rateLimitText },
  ],
  sections,
  requestPanes,
  responsePanes,
};

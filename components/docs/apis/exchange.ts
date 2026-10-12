/** 接口文档内容；字段行为与数字均为 2026-10-11 实测（一次调用的完整响应 + 上游同一轮取样） */
import { API } from '@/lib/api/endpoints';
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

const path = API.publicApi.exchange;
const url = apiUrl(path);

/** 实测 25 个币对里人民币在前的那 15 个，照上游原表顺序抄下来 */
const CNY_FIRST = 'CNY/MOP、CNY/MYR、CNY/RUB、CNY/ZAR、CNY/KRW、CNY/AED、CNY/SAR、CNY/HUF、CNY/PLN、CNY/DKK、CNY/SEK、CNY/NOK、CNY/TRY、CNY/MXN、CNY/THB';

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(
        ...text(
          '想拿人民币的官方参考价，你得上中国外汇交易中心官网把那张二十几行的表读一遍，还得自己分清哪几行是外币在前、哪几行是人民币在前。这里把整张表搬回来，连发布日和每个币对较前一交易日的涨跌点数一起给。',
        ),
      ),
      envelopeOverview('就是这份中间价'),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '这是中间价，不是你能成交的价。',
        fragments: text(
          '由中国外汇交易中心在每个交易日 9:15 发布一次，是当日牌价的参考价，不跟盘中波动；周末与节假日不更新，所以实测周日（10-11）拿到的 date 还是周五的 2026-10-09。',
        ),
      },
    ],
  },
  requestSection({ path }),
  paramsSection(undefined, {
    kind: 'callout',
    tone: 'warn',
    mark: '!',
    strong: '没有参数，也没法只要一个币对。',
    fragments: [
      { type: 'text', value: '25 个币对一次全给，服务端不做筛选，也没有 limit、pair 这类参数；多余的查询参数根本不会被读取。只要美元的话，从 ' },
      { type: 'code', value: 'rates' },
      { type: 'text', value: ' 里挑 ' },
      { type: 'code', value: 'pair' },
      { type: 'text', value: ' 等于 USD/CNY 的那一条就行。' },
    ],
  }),
  responseSection(
    '这份牌价，25 个币对一次给全。',
    [
      {
        name: 'date',
        type: 'string',
        description: text('这份中间价的发布日，YYYY-MM-DD。非交易日拿到的是上一交易日那份'),
        isChild: true,
      },
      {
        name: 'rates',
        type: 'array',
        description: text('币对列表，实测 25 条，顺序照上游原表：前 10 个外币在前、后 15 个人民币在前'),
        isChild: true,
      },
      {
        name: 'name',
        type: 'string',
        description: text('中文币对名原文，如「美元/人民币」「100日元/人民币」'),
        isChild: true,
      },
      {
        name: 'pair',
        type: 'string',
        description: text('国际写法，如 USD/CNY、100JPY/CNY。方向以它为准'),
        isChild: true,
      },
      {
        name: 'currency',
        type: 'string',
        description: text('那枚外币的代码，如 USD；人民币在前的那些给的是 MOP、THB 这类'),
        isChild: true,
      },
      {
        name: 'price',
        type: 'number',
        description: text('牌价数值，读法按 pair。小数位不固定，实测 2 到 5 位都有：6.733、0.85798、200.18、48.4644'),
        isChild: true,
      },
      {
        name: 'change',
        type: 'number | null',
        description: text('较前一交易日的涨跌，单位是「点」，1 点 = 0.0001。实测 25 条都给了数，有负数也带小数：-37、-5.1、+305.4。上游另有一列无符号绝对值，我们取的是带符号那列'),
        isChild: true,
      },
      cachedRow('1 小时'),
    ],
    {
      kind: 'callout',
      tone: 'warn',
      mark: '!',
      strong: '25 个币对的方向不一致。',
      fragments: [
        { type: 'text', value: '前 10 个是「外币/人民币」，其中 ' },
        { type: 'code', value: '100JPY/CNY' },
        { type: 'text', value: ' 按 100 单位日元报；后 15 个反过来是「人民币/外币」。判断方向请读 ' },
        { type: 'code', value: 'pair' },
        { type: 'text', value: '，别拿「是不是人民币」猜——' },
        { type: 'code', value: 'currency' },
        { type: 'text', value: ' 两种方向下给的都是那枚外币，光看它分不出谁是分子。' },
      ],
    },
  ),
  headersSection({
    cache: text('整份牌价缓存 1 小时，响应头按同一时长给 max-age；上游每个交易日 9:15 才发一次，更快的轮询拿到的还是同一份。'),
    cacheExample: 'private, max-age=3600, stale-while-revalidate=1800',
    traceId: 'mv3l51tr-8a0ed3f40b05',
  }),
  errorsSection(
    [
      METHOD_NOT_SUPPORTED_ROW,
      rateLimitedRow(text('按 Retry-After 退避。牌价一天只有一份，重试再快也不会提前拿到明天的价。')),
      {
        http: '503',
        statusCode: '503',
        label: '上游取不到',
        description: text('message 固定「汇率中间价暂时取不到」，description 给具体原因（上游非 200、响应不是 JSON、records 里没有可用币对、上游失败后仍在冷却）'),
        suggestion: SERVER_ERROR_SUGGESTION,
      },
    ],
    {
      hasValidation: false,
      callout: {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '没有 422，也没有 404。',
        fragments: text(
          '接口无参数，因此不存在取值非法、校验失败这类分支；多余的查询参数被忽略，结果仍是同一份牌价。上游这次没给数据统一 503，这里没有「查无此币对」那种返回。',
        ),
      },
    },
  ),
  limitsSection([
    RATE_LIMIT_ROW,
    {
      item: '币对清单',
      limit: '25 个 / 一次全给',
      description: text(`人民币在前的 15 个实测是 ${CNY_FIRST}；外币在前的 10 个是 USD、EUR、100JPY、HKD、GBP、AUD、NZD、SGD、CHF、CAD。要加一个币对得等上游给，我们不替它编。`),
    },
    {
      item: '上游发布节奏',
      limit: '每交易日 9:15 一次',
      description: text('工作日发布，周末与法定节假日不更新。非交易日刷新只是把上一交易日那份再取一次。'),
    },
    {
      item: '服务端缓存',
      limit: '1 小时 / 全局一份',
      description: [
        { type: 'text', value: '常量 ' },
        { type: 'code', value: 'EXCHANGE_TTL_MS' },
        { type: 'text', value: '，单进程内存表；命中时 ' },
        { type: 'code', value: 'data.cached' },
        { type: 'text', value: ' 为 true，同键并发首请求合并成一次上游调用。' },
      ],
    },
    {
      item: '外部依赖',
      limit: 'www.chinamoney.com.cn',
      description: [
        { type: 'code', value: 'ccpr.json' },
        { type: 'text', value: ' 是官网的公开数据文件，实测免 cookie、免签名。它不是对方对外承诺的稳定接口，改版或下线会直接体现为 503。' },
      ],
    },
    {
      item: '并发建议',
      limit: '≤ 2 QPS',
      description: text('一次调用最多打一次上游，缓存期内所有请求共用那一份。更高的并发只是把同一个数字取回来很多次。'),
    },
    {
      item: '客户端建议',
      limit: '本地留到次日 9:15 后',
      description: text('中间价一天一份，本地存到第二天发布之后再换完全够用。要看盘中波动就别用这个接口。'),
    },
    UPSTREAM_TIMEOUT_ROW,
  ]),
  changelogSection([
    {
      date: '2026-10-11',
      version: 'v1.0',
      description: text('人民币汇率中间价上线：免鉴权、无参数，一次给 25 个币对的官方中间价与涨跌点数，服务端缓存 1 小时。'),
    },
  ]),
];

const requestPanes: CodePaneData[] = [
  {
    value: 'curl',
    label: 'cURL',
    lang: 'bash',
    code: `# 无参数，直接 GET 就是整张牌价
curl "${url}"

# 只看美元：接口不筛，自己从 rates 里挑
curl -s "${url}" | jq '.data.rates[] | select(.pair == "USD/CNY")'`,
  },
  {
    value: 'js',
    label: 'JavaScript',
    lang: 'js',
    code: `const res = await fetch("${url}");
const { statusCode, message, data, meta } = await res.json();

if (statusCode === 200) {
  console.log(data.date, "共", data.rates.length, "个币对", "cached:", data.cached);
  const usd = data.rates.find((one) => one.pair === "USD/CNY");
  // change 的单位是点，1 点 = 0.0001
  console.log(usd.name, usd.price, "较前一交易日", usd.change);
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

body = requests.get("${url}").json()
data = body["data"]
if body["statusCode"] == 200:
    print(data["date"], len(data["rates"]), "个币对", "cached:", data["cached"])
    usd = next(one for one in data["rates"] if one["pair"] == "USD/CNY")
    print(f'{usd["name"]}  {usd["price"]}  较前一交易日 {usd["change"]} 点')
else:
    print(body["statusCode"], body["message"])
print("requestId:", body["meta"]["requestId"])`,
  },
];

const responsePanes: CodePaneData[] = [
  successPane({
    label: '200 · 回源',
    requestId: 'mv3l51tr-8a0ed3f40b05',
    serverTime: '2026-10-11T08:52:48.639Z',
    dataJson: `{
    "date": "2026-10-09",
    "rates": [
      { "name": "美元/人民币", "pair": "USD/CNY", "currency": "USD", "price": 6.733, "change": -37 },
      { "name": "欧元/人民币", "pair": "EUR/CNY", "currency": "EUR", "price": 7.5323, "change": -81 },
      { "name": "100日元/人民币", "pair": "100JPY/CNY", "currency": "JPY", "price": 4.2571, "change": -71 },
      { "name": "港元/人民币", "pair": "HKD/CNY", "currency": "HKD", "price": 0.85798, "change": -5.1 },
      { "name": "英镑/人民币", "pair": "GBP/CNY", "currency": "GBP", "price": 8.8872, "change": -100 }
      // … 实测共 25 个币对，这里只列前 5 行；第 11 个起方向变成 CNY/…
    ],
    "cached": false
  }`,
  }),
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const exchangeDoc: AuthoredApiDoc = {
  eyebrow: 'Data API · v1',
  lede: '中国外汇交易中心的人民币中间价，不是市场价。',
  facts: ['每个交易日 9:15 发布一次，周末与节假日不更新', '只有最新一份，没有历史日期可查'],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-11' },
    { label: '币对数量', value: '25 个（10 个外币在前、15 个人民币在前）' },
    { label: '服务端缓存', value: '1 小时' },
    { label: '限频', value: rateLimitText },
  ],
  sections,
  requestPanes,
  responsePanes,
};

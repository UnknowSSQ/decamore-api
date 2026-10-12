/** 接口文档内容；字段行为与数字均为 2026-10-11 实测 */
import { API } from '@/lib/api/endpoints';
import { STOCK_CODES_HINT } from '@/lib/zod/public.schema';
import { STOCK_MARKETS, STOCK_MAX_CODES } from '@/constants/stock-markets';
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

const path = API.publicApi.stock;
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(...text('自选股想显示实时价，本来要按市场挨个找行情页。这个接口一次能报最多 20 个代码，沪深北的个股与指数、港股、美股混在一串里都行，返回同一个形状。')),
      envelopeOverview('是一组证券的行情快照'),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '休市时给的是上一个交易日的收盘快照。',
        fragments: text('上游此时就停在最后一笔上：2026-10-11（周日）实测取到的是 10-09 的收盘数据，price 与 quoteTime 一起回到那天，不会编出「今日」的数字。'),
      },
    ],
  },
  requestSection({ path }),
  paramsSection([
    {
      name: 'codes',
      type: 'string',
      required: 'yes',
      defaultValue: '无默认值',
      description: [
        { type: 'text', value: '逗号分隔的「市场前缀 + 代码」，最多 ' },
        { type: 'code', value: String(STOCK_MAX_CODES) },
        { type: 'text', value: ' 个。前缀有五种：' },
        { type: 'code', value: STOCK_MARKETS.map((one) => one.sample).join(' / ') },
        { type: 'text', value: '。前缀大小写都认（' },
        { type: 'code', value: 'HK00700' },
        { type: 'text', value: ' 与 ' },
        { type: 'code', value: 'hk00700' },
        { type: 'text', value: ' 同义），代码部分统一按大写比对。不传、全空或一个都解析不出来都返回 422。' },
      ],
    },
  ]),
  responseSection(
    '一组证券的行情快照，items 按请求里的顺序回。',
    [
      { name: 'updatedAt', type: 'string', description: text('服务端抓取这组的时刻，ISO。上游不给批量时刻，所以只能到这里。'), isChild: true },
      { name: 'requested', type: 'integer', description: text('规范化后的代码数（去空白、去重、补前缀之后的数量）。'), isChild: true },
      { name: 'count', type: 'integer', description: text('实际给出的条数。比 requested 小说明有代码查无行情，那些直接缺席、不占位。'), isChild: true },
      { name: 'items', type: 'array', description: text('行情数组，顺序与入参一致。'), isChild: true },
      { name: 'code', type: 'string', description: text('规范化后的写法（小写前缀 + 大写代码），可直接拿来回填请求。'), isChild: true },
      { name: 'market', type: 'string', description: text('市场前缀，sh / sz / bj / hk / us 之一。'), isChild: true },
      { name: 'name', type: 'string', description: text('中文名，美股也是中文名（「苹果」）。'), isChild: true },
      {
        name: 'symbol',
        type: 'string',
        description: text('交易所侧的代码原文：A 股 600519、港股 00700 补足五位、美股带交易所后缀（AAPL.OQ）。'),
        isChild: true,
      },
      { name: 'price', type: 'number', description: text('最新价，币种见 currency。'), isChild: true },
      { name: 'prevClose', type: 'number', description: text('昨收。'), isChild: true },
      { name: 'open', type: 'number', description: text('今日开盘。'), isChild: true },
      { name: 'high', type: 'number', description: text('今日最高。'), isChild: true },
      { name: 'low', type: 'number', description: text('今日最低。'), isChild: true },
      { name: 'change', type: 'number', description: text('涨跌额，price 减 prevClose，实测 -3.78 到 +13.4 都有。'), isChild: true },
      { name: 'changePercent', type: 'number', description: text('涨跌幅，直接是百分数的数值（0.57 就是 +0.57%）。'), isChild: true },
      {
        name: 'volume',
        type: 'number',
        description: text('成交量，统一成「股」。A 股族上游给的是手，这里已经乘 100（实测 35,111 手回成 3,511,100）。'),
        isChild: true,
      },
      {
        name: 'amount',
        type: 'number',
        description: text('成交额，统一成「元」。A 股族上游给万元，已乘 10,000（445,322 万元回成 4,453,220,000）。'),
        isChild: true,
      },
      { name: 'turnoverRate', type: 'number | null', description: text('换手率百分数。港股上游多给 0，就照原样回 0。'), isChild: true },
      { name: 'peRatio', type: 'number | null', description: text('市盈率。指数也带这个字段（上证 16.59、创业板指 51.93）；ETF 上游不给，是 null。'), isChild: true },
      { name: 'amplitude', type: 'number | null', description: text('当日振幅百分数，实测与（高减低）/ 昨收吻合。'), isChild: true },
      { name: 'floatMarketCap', type: 'number | null', description: text('流通市值，单位亿元。'), isChild: true },
      { name: 'totalMarketCap', type: 'number | null', description: text('总市值，单位亿元。'), isChild: true },
      { name: 'week52High', type: 'number | null', description: text('52 周最高。'), isChild: true },
      { name: 'week52Low', type: 'number | null', description: text('52 周最低。'), isChild: true },
      {
        name: 'limitUp',
        type: 'number | null',
        description: text('涨停价，只有 A 股族有；上游对指数写 -1，这里归成 null。实测 1,255.79 × 1.1 = 1,381.37 对得上。'),
        isChild: true,
      },
      { name: 'limitDown', type: 'number | null', description: text('跌停价，规则同上。'), isChild: true },
      { name: 'currency', type: 'string', description: text('CNY / HKD / USD。价量都是这个币种，不做汇率折算。'), isChild: true },
      {
        name: 'kind',
        type: 'string',
        description: text('上游的品种标记原样回：GP-A 是 A 股个股、ZS 是指数、ETF 是基金、GP 是港美股个股。'),
        isChild: true,
      },
      {
        name: 'quoteTime',
        type: 'string',
        description: text('上游的时刻原文，形态随市场不同：A 股是紧凑 14 位 20261009161459，港股日期用 0x2F 斜杠，美股用 0x2D 横杠。'),
        isChild: true,
      },
      {
        name: 'quotedAt',
        type: 'string | null',
        description: text('按交易所当地时区换算的 ISO（沪深港港用东八区，美股用 America/New_York 并跟夏令时）。美股夏令时实测 16:00:01 换成 20:00:01Z。'),
        isChild: true,
      },
    ],
  ),
  headersSection({
    cache: text('接口不缓存，HTTP 层也就跟着给 no-store——行情缓存 60 秒就是把旧价当新价给。'),
    cacheExample: 'no-store, max-age=0',
    traceId: 'mv3u4jzl-17cb51ed1fad',
  }),
  errorsSection(
    [
      METHOD_NOT_SUPPORTED_ROW,
      validationRow({
        label: 'codes 不合法',
        message: STOCK_CODES_HINT,
        field: 'codes',
        suggestion: text('按「前缀 + 代码」写，一次别超过 20 个。'),
      }),
      {
        http: '404',
        statusCode: '404',
        label: '代码查无行情',
        description: text('代码写得合法但上游那边没有这一只（实测 sh999999、usHSI 都是），message 会把落空的代码列全。只有一部分查不到时不报错，是 200 加更少的 items。'),
        suggestion: text('A 股六位数字、港股五位或英文缩写、美股是字母代码；港指数的写法是 hkHSI 而不是 usHSI。'),
      },
      rateLimitedRow(text('每次都要回源，别把「刷新快点」当成「价格新点」——上游本来就是几十毫秒一次，多余的请求只是排队。')),
      {
        http: '503',
        statusCode: '503',
        label: '行情取不到',
        description: text('message 固定「行情暂时取不到」，description 里是上游的具体原因（连不上、非 200、超时）'),
        suggestion: SERVER_ERROR_SUGGESTION,
      },
    ],
    {
      hasValidation: true,
      callout: {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '422 与 404 是两件事。',
        fragments: text('写法就不对（缺前缀、A 股不是六位、一次超过 20 个）是 422，带 issues；写法对但没有这只股票是 404，不带 issues。上游对查不到的代码只回一行 v_pv_none_match="1"，本站把它翻译成 404，而不是给你一条 price 为 0 的空记录。'),
      },
    },
  ),
  limitsSection([
    RATE_LIMIT_ROW,
    {
      item: '接口缓存',
      limit: '不缓存',
      description: text('每请求回源一次。榜单类那套 60 秒进程内缓存在这里不适用：行情要的是新，而 codes 的组合会把缓存键撑满。'),
    },
    {
      item: '单次代码数',
      limit: `${STOCK_MAX_CODES} 个（超出 422）`,
      description: text(`上游实测约 50 条封顶（一次传 120 个只回 50 条），所以上限给到 20：够一屏自选股，也让响应体稳在 2KB 出头（实测三个代码 1,698 字节）。`),
    },
    {
      item: '量纲统一',
      limit: '股 / 元',
      description: text('A 股族上游的成交量单位是手、成交额是万元，出参分别乘 100 与 10,000；港股美股原样。所以同一字段跨市场可比。'),
    },
    {
      item: '时区',
      limit: '按交易所',
      description: text('上游的时刻都不带时区。沪深北与港船用东八区，美股用 America/New_York 并跟夏令时切换，换算用 Intl 查偏移。'),
    },
    {
      item: '外部依赖',
      limit: '腾讯行情 qt.gtimg.cn',
      description: text('实测免 key、免 cookie，境内直连：同一串三个代码四次抽样 11–128ms（首连含 DNS 与 TLS 最慢），接口端到端 15–71ms。响应体声明 charset=GBK，服务端按 GBK 解码；不属于公开文档化的接口，对方改版会直接体现为 503 或字段缺失。'),
    },
    UPSTREAM_TIMEOUT_ROW,
  ]),
  changelogSection([
    {
      date: '2026-10-11',
      version: 'v1.0',
      description: text('行情上线：一次最多 20 个代码，覆盖沪、深、北、港、美五个市场，量纲统一成股与元、时刻按交易所时区换 ISO，查无此码返回 404。'),
    },
  ]),
];

const requestPanes: CodePaneData[] = [
  {
    value: 'curl',
    label: 'cURL',
    lang: 'bash',
    code: `# 三个市场各一只
curl "${url}?codes=sh600519,hk00700,usAAPL"

# 只要指数：上证与创业板指
curl "${url}?codes=sh000001,sz399006"

# 前缀大小写都认
curl "${url}?codes=HK00700"`,
  },
  {
    value: 'js',
    label: 'JavaScript',
    lang: 'js',
    code: `const params = new URLSearchParams({ codes: "sh600519,sz399006,usAAPL" });
const res = await fetch("${url}?" + params);
const { statusCode, message, data } = await res.json();

if (statusCode === 200) {
  for (const one of data.items) {
    console.log(one.code, one.name, one.price, one.changePercent + "%", one.currency);
  }
  if (data.count < data.requested) console.log("有代码查无行情");
} else {
  console.error(statusCode, message);
}`,
  },
  {
    value: 'py',
    label: 'Python',
    lang: 'py',
    code: `import requests

body = requests.get("${url}", params={"codes": "sh600519,hk00700,usAAPL"}).json()
if body["statusCode"] == 200:
    for one in body["data"]["items"]:
        print(one["code"], one["name"], one["price"], one["changePercent"], one["currency"])
else:
    print(body["statusCode"], body["message"])`,
  },
];

const responsePanes: CodePaneData[] = [
  successPane({
    label: '200 · 沪深港美各一只',
    requestId: 'mv3u4jzl-17cb51ed1fad',
    serverTime: '2026-10-11T13:04:22.107Z',
    dataJson: `{
    "updatedAt": "2026-10-11T13:04:22.107Z",
    "requested": 3,
    "count": 3,
    "items": [
      {
        "code": "sh600519",
        "market": "sh",
        "name": "贵州茅台",
        "symbol": "600519",
        "price": 1263,
        "prevClose": 1255.79,
        "open": 1255.42,
        "high": 1282,
        "low": 1255.42,
        "change": 7.21,
        "changePercent": 0.57,
        "volume": 3511100,
        "amount": 4453220000,
        "turnoverRate": 0.28,
        "peRatio": 19.39,
        "amplitude": 2.12,
        "floatMarketCap": 15788.53,
        "totalMarketCap": 15788.53,
        "week52High": 1539.98,
        "week52Low": 1151.01,
        "limitUp": 1381.37,
        "limitDown": 1130.21,
        "currency": "CNY",
        "kind": "GP-A",
        "quoteTime": "20261009161459",
        "quotedAt": "2026-10-09T08:14:59.000Z"
      },
      {
        "code": "hk00700",
        "market": "hk",
        "name": "腾讯控股",
        "symbol": "00700",
        "price": 424.8,
        "prevClose": 411.4,
        "open": 415,
        "high": 425.8,
        "low": 414.8,
        "change": 13.4,
        "changePercent": 3.26,
        "volume": 20422500,
        "amount": 8610387928.73,
        "turnoverRate": 0,
        "peRatio": 15.52,
        "amplitude": 2.67,
        "floatMarketCap": 38625.3886,
        "totalMarketCap": 38625.3886,
        "week52High": 663.7,
        "week52Low": 411,
        "limitUp": null,
        "limitDown": null,
        "currency": "HKD",
        "kind": "GP",
        "quoteTime": "2026/10/09 16:08:14",
        "quotedAt": "2026-10-09T08:08:14.000Z"
      },
      {
        "code": "usAAPL",
        "market": "us",
        "name": "苹果",
        "symbol": "AAPL.OQ",
        "price": 336.64,
        "prevClose": 340.42,
        "open": 331.7,
        "high": 338.61,
        "low": 330.7,
        "change": -3.78,
        "changePercent": -1.11,
        "volume": 37881199,
        "amount": 12681326971,
        "turnoverRate": 0.26,
        "peRatio": 38.61,
        "amplitude": 2.32,
        "floatMarketCap": 49099.31053,
        "totalMarketCap": 49129.84755,
        "week52High": 345.34,
        "week52Low": 242.76,
        "limitUp": null,
        "limitDown": null,
        "currency": "USD",
        "kind": "GP",
        "quoteTime": "2026-10-09 16:00:01",
        "quotedAt": "2026-10-09T20:00:01.000Z"
      }
    ]
  }`,
  }),
  failurePane({
    label: '422 · codes 写法不对',
    statusCode: 422,
    message: STOCK_CODES_HINT,
    requestId: 'mv3u497j-962373dcf6b3',
    serverTime: '2026-10-11T13:04:08.096Z',
    description: `codes：${STOCK_CODES_HINT}`,
    issues: [{ field: 'codes', message: STOCK_CODES_HINT, code: 'custom' }],
  }),
  failurePane({
    label: '404 · 代码合法但查无行情',
    statusCode: 404,
    value: 'missing',
    message: '这几个代码查无行情：sh999999',
    requestId: 'mv3u49f8-bd225b6adfc0',
    serverTime: '2026-10-11T13:04:08.383Z',
  }),
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const stockDoc: AuthoredApiDoc = {
  eyebrow: 'Data API · v1',
  lede: '沪深北港美一次报完的行情快照',
  facts: [
    `${STOCK_MAX_CODES} 个代码一次报完，五个市场混着写`,
    '量纲统一成股与元，时刻按交易所时区换 ISO',
  ],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-11' },
    { label: '市场', value: STOCK_MARKETS.map((one) => one.label).join(' · ') },
    { label: '服务端缓存', value: '无，每次现取' },
    { label: '限频', value: rateLimitText },
  ],
  sections,
  requestPanes,
  responsePanes,
};

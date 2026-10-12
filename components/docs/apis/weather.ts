/** 接口文档内容；字段行为与数字均为 2026-10-11 实测（39 个城市逐个跑通，取值取自当日那一轮） */
import { WEATHER_CITIES } from '@/constants/weather-cities';
import { API } from '@/lib/api/endpoints';
import { WEATHER_CITY_HINT } from '@/lib/zod/public.schema';
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

const path = API.publicApi.weather;
const url = apiUrl(path);

/** 城市表只有一份（constants/weather-cities.ts），文档里的个数与键都从它派生 */
const CITY_COUNT = WEATHER_CITIES.length;
const CITY_KEYS = WEATHER_CITIES.map((one) => one.key).join(' · ');

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(
        ...text(
          `一个请求拿到一座城市此刻的天气：温度、天气现象、风向风力、湿度、气压、能见度，加上当天的空气质量。${CITY_COUNT} 座城市覆盖全部省会、四个直辖市和大连青岛宁波厦门深圳。`,
        ),
      ),
      envelopeOverview('就是这一座城市的实况'),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '只有实况，没有预报。',
        fragments: text(
          '上游这个端点就给当前一刻的数据。明后天冷不冷、要不要带伞，我们不去别处拼一份看着像预报的东西给你。',
        ),
      },
    ],
  },
  requestSection({ path }),
  paramsSection(
    [
      {
        name: 'city',
        type: 'string',
        required: 'no',
        defaultValue: 'beijing',
        description: [
          { type: 'text', value: '城市键，用拼音。大小写不敏感、两头空格会去掉（' },
          { type: 'code', value: '?city=BEIJING' },
          { type: 'text', value: ' 与 ' },
          { type: 'code', value: '?city=beijing' },
          { type: 'text', value: ' 是同一个请求）。全部取值：' },
          { type: 'code', value: CITY_KEYS },
          { type: 'text', value: '。' },
        ],
      },
    ],
    {
      kind: 'callout',
      tone: 'warn',
      mark: '!',
      strong: '城市不在表里就是 422，不会悄悄给你北京。',
      fragments: text(
        `?city=xiamenn 直接 422 并说明只有这 ${CITY_COUNT} 个键。空串（?city=）等价于不传，走北京。`,
      ),
    },
  ),
  responseSection(
    '这一座城市的实况。',
    [
      { name: 'key', type: 'string', description: text('你传的键，规范化成小写'), isChild: true },
      { name: 'city', type: 'string', description: text('上游给的中文城市名，如「呼和浩特」'), isChild: true },
      { name: 'code', type: 'string', description: text('中国天气网的 9 位城市码，如 101010100。想加城市时它是唯一凭据'), isChild: true },
      { name: 'temp', type: 'number | null', description: text('摄氏度，实测一位小数（25.3）也有整数（27）；39 城同轮实测 4.2 到 31.7'), isChild: true },
      { name: 'tempf', type: 'number | null', description: text('华氏度，上游算好的，不做二次换算'), isChild: true },
      { name: 'weather', type: 'string', description: text('天气现象中文。实测见过 晴 / 多云 / 阴 / 霾'), isChild: true },
      { name: 'weatherEn', type: 'string', description: text('同一现象的英文（Sunny / Cloudy / Overcast / Light haze），做国际化时别再自己映射一遍'), isChild: true },
      { name: 'windDir', type: 'string', description: text('风向中文，如「南风」'), isChild: true },
      { name: 'windDirEn', type: 'string', description: text('风向单字母（S / NE / W…）'), isChild: true },
      { name: 'windPower', type: 'string', description: text('风力原文「2级」——上游不给数值，我们也不剥成 2'), isChild: true },
      { name: 'windSpeed', type: 'string', description: text('风速原文「5km/h」，同上'), isChild: true },
      { name: 'humidity', type: 'string', description: text('相对湿度「43%」，带百分号'), isChild: true },
      { name: 'pressure', type: 'number | null', description: text('气压，百帕。实测 1012 上下'), isChild: true },
      { name: 'visibility', type: 'string', description: text('能见度「6km」，实测 6 到 30km'), isChild: true },
      { name: 'aqi', type: 'number | null', description: text('当天空气质量指数，实测 29 到 125。上游另有一列 PM2.5 口径，同轮实测与它相同，就不重复给了'), isChild: true },
      { name: 'rain', type: 'string', description: text('降水量，实测多数城市是「0」，有雨的给「0.8」这样的字符串'), isChild: true },
      { name: 'time', type: 'string', description: text('观测时刻 HH:MM，北京时间，不带日期'), isChild: true },
      { name: 'dateLabel', type: 'string', description: text('上游自己拼的日期串，形如「10月11日(星期日)」，要日期请用它或干脆用 serverTime'), isChild: true },
      { name: 'limitNumber', type: 'string', description: text('尾号限行提示，实测是「不限行」或空串'), isChild: true },
      cachedRow('5 分钟'),
    ],
    {
      kind: 'callout',
      tone: 'info',
      mark: 'i',
      strong: '带单位的字段刻意留成字符串。',
      fragments: text(
        'windPower、windSpeed、humidity、visibility 上游就是「2级」「5km/h」「43%」「6km」这种原样，剥成数字得先猜它的规则，所以我们把原文交给你。',
      ),
    },
  ),
  headersSection({
    cache: text('实况本身十几分钟才变一次，服务端缓存 5 分钟，响应头按同一时长给 max-age。'),
    cacheExample: 'private, max-age=300, stale-while-revalidate=150',
    traceId: 'mv3l51tu-15e32916b36c',
  }),
  errorsSection(
    [
      METHOD_NOT_SUPPORTED_ROW,
      validationRow({
        label: 'city 不在城市表里',
        message: WEATHER_CITY_HINT,
        field: 'city',
        suggestion: text('对照参数表里的取值；拼错了先按拼音试一次。'),
      }),
      rateLimitedRow(text('按 Retry-After 退避。城市是固定的那几十个，换着传不会拿到更多数据。')),
      {
        http: '503',
        statusCode: '503',
        label: '上游取不到',
        description: text('message 固定「城市实况天气暂时取不到」，description 给具体原因（上游非 200、超时、或该城市码这次没回数据）'),
        suggestion: SERVER_ERROR_SUGGESTION,
      },
    ],
    {
      hasValidation: true,
      callout: {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '422 的 issues[].code 是 custom。',
        fragments: text('这个参数是拿内置表比对的，不是枚举常量，所以 zod 给的是 custom 而不是 invalid_type。按 message 读就行。'),
      },
    },
  ),
  limitsSection([
    RATE_LIMIT_ROW,
    {
      item: '服务端缓存',
      limit: '5 分钟 / 每城市',
      description: text('并发首请求合并成一次上游调用；换城市就是换一份缓存，不会互相顶掉。'),
    },
    {
      item: '外部依赖',
      limit: `中国天气网实况端点（${CITY_COUNT} 城）`,
      description: text('d1.weather.com.cn 那个端点是站内自己在用的，实测免 cookie 免 key，但要带站内 referer。城市码表是我们在代码里整理的一份，官方那份市表端点已经打不开了。'),
    },
    {
      item: '加城市',
      limit: '要改代码',
      description: text('城市表随版本发布，传表外的键一律 422。需要别的城市，把它的 9 位城市码提给我们，加一行就行。'),
    },
    UPSTREAM_TIMEOUT_ROW,
  ]),
  changelogSection([
    {
      date: '2026-10-11',
      version: 'v1.0',
      description: text(`城市实况天气上线：${CITY_COUNT} 座城市的当前温度、现象、风、湿度、气压、能见度与 AQI，服务端缓存 5 分钟。`),
    },
  ]),
];

const requestPanes: CodePaneData[] = [
  {
    value: 'curl',
    label: 'cURL',
    lang: 'bash',
    code: `# 不传 city：北京
curl "${url}"

# 指定城市（拼音）
curl "${url}?city=hangzhou"
curl "${url}?city=shenzhen"`,
  },
  {
    value: 'js',
    label: 'JavaScript',
    lang: 'js',
    code: `const res = await fetch("${url}?city=chengdu");
const { statusCode, data, meta } = await res.json();

if (statusCode === 200) {
  console.log(data.city, data.temp + "℃", data.weather, data.windDir + data.windPower);
  console.log("湿度", data.humidity, "气压", data.pressure + "hPa", "AQI", data.aqi, "观测于", data.time);
}
console.log("requestId:", meta.requestId);`,
  },
  {
    value: 'py',
    label: 'Python',
    lang: 'py',
    code: `import requests

body = requests.get("${url}", params={"city": "xiamen"}).json()
data = body["data"]
if body["statusCode"] == 200:
    print(f'{data["city"]}  {data["temp"]}℃  {data["weather"]}  {data["windDir"]}{data["windPower"]}')
    print(f'湿度 {data["humidity"]}  能见度 {data["visibility"]}  AQI {data["aqi"]}  ({data["dateLabel"]} {data["time"]})')
else:
    print(body["statusCode"], body["message"])`,
  },
];

const responsePanes: CodePaneData[] = [
  successPane({
    label: '200 · 北京（缺省）',
    requestId: 'mv3l51tu-15e32916b36c',
    serverTime: '2026-10-11T08:52:48.642Z',
    dataJson: `{
    "key": "beijing",
    "city": "北京",
    "code": "101010100",
    "temp": 25.3,
    "tempf": 77.5,
    "weather": "霾",
    "weatherEn": "Light haze",
    "windDir": "南风",
    "windDirEn": "S",
    "windPower": "2级",
    "windSpeed": "5km/h",
    "humidity": "43%",
    "pressure": 1014,
    "visibility": "6km",
    "aqi": 106,
    "rain": "0",
    "time": "16:35",
    "dateLabel": "10月11日(星期日)",
    "limitNumber": "不限行",
    "cached": true
  }`,
  }),
  successPane({
    label: '200 · ?city=hangzhou',
    value: 'hangzhou',
    requestId: 'mv3l51tw-b7c9d605d328',
    serverTime: '2026-10-11T08:52:48.798Z',
    dataJson: `{
    "key": "hangzhou",
    "city": "杭州",
    "code": "101210101",
    "temp": 26.4,
    "tempf": 79.5,
    "weather": "晴",
    "weatherEn": "Sunny",
    "windDir": "东北风",
    "windDirEn": "NE",
    "windPower": "2级",
    "windSpeed": "8km/h",
    "humidity": "49%",
    "pressure": 1012,
    "visibility": "17km",
    "aqi": 58,
    "rain": "0",
    "time": "16:35",
    "dateLabel": "10月11日(星期日)",
    "limitNumber": "不限行",
    "cached": false
  }`,
  }),
  failurePane({
    statusCode: 422,
    message: WEATHER_CITY_HINT,
    requestId: 'mv3l523x-af12e931fe71',
    serverTime: '2026-10-11T08:52:49.005Z',
    description: `city：${WEATHER_CITY_HINT}`,
    issues: [
      {
        field: 'city',
        message: WEATHER_CITY_HINT,
        code: 'custom',
      },
    ],
  }),
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const weatherDoc: AuthoredApiDoc = {
  eyebrow: 'Data API · v1',
  lede: '一座城市此刻的天气，加当天的空气质量。',
  facts: [`${CITY_COUNT} 座城市，省会与直辖市全覆盖`, '实况每次现取，服务端缓存 5 分钟'],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-11' },
    { label: '数据来源', value: '中国天气网实况端点（免 key）' },
    { label: '服务端缓存', value: '5 分钟 / 每城市' },
    { label: '限频', value: rateLimitText },
  ],
  sections,
  requestPanes,
  responsePanes,
};

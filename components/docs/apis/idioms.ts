/** 接口文档内容；条数与体积均为 2026-10-10 实测（50,373 条逐条数过） */
import { API } from '@/lib/api/endpoints';
import { para, text } from '../fragments';
import { apiUrl } from '../url';
import {
  METHOD_NOT_SUPPORTED_ROW,
  RATE_LIMIT_ROW,
  SERVER_ERROR_SUGGESTION,
  TIMEOUT_LIMIT_ROW,
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
} from '../commonSections';
import type { AuthoredApiDoc, CodePaneData, DocSection } from '../types';

const path = API.publicApi.idioms;
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(
        ...text(
          '填字、出题、做接龙素材时，需要的是「来几个成语」，而不是查某一条的释义——这个接口就做这一件事。',
        ),
      ),
      envelopeOverview('就是这次抽到的成语'),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '只有成语本身，没有释义与出处。',
        fragments: text(
          '语料里每条就一个字段，我们不替你编一份解释。要释义请找词典类接口，这里给的是干净的一批词条。',
        ),
      },
    ],
  },
  requestSection({ path }),
  paramsSection(
    [
      {
        name: 'limit',
        type: 'integer',
        required: 'no',
        defaultValue: '1',
        description: [
          { type: 'text', value: '这次要几条，取值 1–100；同一次返回里不会重复。实测 1 条响应约 193 字节，100 条约 1.7 KB。' },
        ],
      },
      {
        name: 'chars',
        type: 'integer',
        required: 'no',
        defaultValue: '不筛',
        description: [
          { type: 'text', value: '按字数筛，取值 4–8。语料实测：4 字 47,246 条、5 字 1,178 条、6 字 601 条、7 字 864 条、8 字 484 条。' },
        ],
      },
    ],
    {
      kind: 'callout',
      tone: 'warn',
      mark: '!',
      strong: '这是唯一一个 limit 有默认值的公开接口。',
      fragments: text(
        '其余带 limit 的接口不传即全量；这里不传只给 1 条。因为整份语料 5 万余条、约 1.2 MB，全量不是一个给浏览器的形状。',
      ),
    },
  ),
  responseSection(
    '这批随机成语，字段见下方子行。',
    [
      {
        name: 'total',
        type: 'integer',
        description: text('语料全量条数，固定 50,373，不随 chars 变化——它是「一共收录多少」'),
        isChild: true,
      },
      {
        name: 'items',
        type: 'string[]',
        description: text('本次抽到的成语，条数由 limit 决定，顺序即抽取顺序'),
        isChild: true,
      },
    ],
    {
      kind: 'callout',
      tone: 'info',
      mark: 'i',
      strong: 'total 不是本次结果的条数。',
      fragments: text('想知道这次给了几条就取 items.length；把 total 当成 count 用会一直显示 5 万多。'),
    },
  ),
  headersSection({
    cache: text('语料读一次常驻进程，响应不缓存：随机接口的返回值每次都不同，缓存下来「换一批」就失效了。'),
    cacheExample: 'no-store, max-age=0',
    traceId: 'mv2fworx-d5d2c414ccb7',
  }),
  errorsSection(
    [
      METHOD_NOT_SUPPORTED_ROW,
      {
        http: '422',
        statusCode: '422',
        label: '参数越界',
        description: [
          { type: 'text', value: '数字类参数的 message 直接用 zod 的英文原文（如「Number must be greater than or equal to 1」），并带 ' },
          { type: 'code', value: 'issues' },
          { type: 'text', value: ' 点明是 limit 还是 chars。' },
        ],
        suggestion: text('limit 收在 1–100，chars 收在 4–8；传 3 或 9 都算越界，因为语料里没有这种词条。'),
      },
      rateLimitedRow(text('按 Retry-After 退避；要批量素材一次取 100 条，比轮询省得多。')),
      {
        http: '500',
        statusCode: '500',
        label: '语料读不出来',
        description: text('public/assets/json/ChengYu.json 缺失、为空或解析失败'),
        suggestion: SERVER_ERROR_SUGGESTION,
      },
    ],
    {
      hasValidation: true,
      callout: {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '筛到零条不会 404。',
        fragments: text(
          'chars 的取值已经限死在有数据的区间（4–8），所以不会出现「这个字数一条都没有」；超出区间是 422，不是空列表。',
        ),
      },
    },
  ),
  limitsSection([
    RATE_LIMIT_ROW,
    {
      item: '语料规模',
      limit: '50,373 条 / 1.2 MB',
      description: text('第一次请求读盘解析，之后走进程内缓存，不再读磁盘。'),
    },
    {
      item: '缓存实现',
      limit: '单进程内存表',
      description: text('词条不变，缓存无需过期策略；换语料要重启进程。'),
    },
    {
      item: '响应体积',
      limit: '193 B – 1.7 KB',
      description: text('实测下上界：limit=1 与 limit=100 各一次的真实字节数。'),
    },
    {
      item: '客户端建议',
      limit: '一次取够再本地分屏',
      description: text('做「每日一条」请在本地按日期存住，别每次进页面都抽，那样今天看还是昨天那条才对。'),
    },
    TIMEOUT_LIMIT_ROW,
  ]),
  changelogSection([
    {
      date: '2026-10-10',
      version: 'v1.0',
      description: text('成语大全上线：50,373 条随机取 N 条（limit 1–100，默认 1），可按 4–8 字筛。'),
    },
  ]),
];

const requestPanes: CodePaneData[] = [
  {
    value: 'curl',
    label: 'cURL',
    lang: 'bash',
    code: `# 默认一条
curl "${url}"

# 一次要 8 条
curl "${url}?limit=8"

# 只要八字成语
curl "${url}?chars=8&limit=2"`,
  },
  {
    value: 'js',
    label: 'JavaScript',
    lang: 'js',
    code: `const res = await fetch("${url}?limit=5");
const { statusCode, message, data, meta } = await res.json();

if (statusCode === 200) {
  console.log(data.items.join('、'));
  console.log('本次', data.items.length, '条 / 语料共', data.total, '条');
  console.log('requestId:', meta.requestId);
} else {
  console.error(message);
}`,
  },
  {
    value: 'py',
    label: 'Python',
    lang: 'py',
    code: `import requests

data = requests.get("${url}", params={"limit": 5, "chars": 4}).json()["data"]
print("、".join(data["items"]), "／语料共", data["total"])`,
  },
];

const responsePanes: CodePaneData[] = [
  successPane({
    label: '200 OK · limit=3',
    requestId: 'mv2fworx-d5d2c414ccb7',
    serverTime: '2026-10-10T13:38:34.221Z',
    dataJson: `{
    "total": 50373,
    "items": [
      "畏敌如虎",
      "国色天姿",
      "画龙刻鹄"
    ]
  }`,
  }),
  failurePane({
    statusCode: 422,
    message: 'Number must be greater than or equal to 1',
    requestId: 'mv2fwpke-195019fb25aa',
    serverTime: '2026-10-10T13:38:35.246Z',
    description: 'limit：Number must be greater than or equal to 1',
    issues: [{ field: 'limit', message: 'Number must be greater than or equal to 1', code: 'too_small' }],
    trailingComment: 'limit=0 的实测响应；数字类参数的报错文案目前是 zod 英文原文',
  }),
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const idiomsDoc: AuthoredApiDoc = {
  eyebrow: 'Content API · v1',
  lede: '五万余条成语，随机来几条。',
  facts: ['收录 50,373 条', '一次最多 100 条，可按字数筛'],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-10' },
    { label: '语料', value: '50,373 条（4–8 字）' },
    { label: '服务端缓存', value: '无（语料常驻进程内存）' },
    { label: '限频', value: rateLimitText },
  ],
  sections,
  requestPanes,
  responsePanes,
};

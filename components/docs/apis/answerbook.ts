/** 接口文档内容；字段行为与数字均为 2026-10-08 实测 */
import { API } from '@/lib/api/endpoints';
import { frag, para, text } from '../fragments';
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

const path = API.publicApi.answerbook;
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(
        ...text(
          '拿不定主意的时候，谁都想过翻一页答案之书。它不解释也不安慰，只把一句话递到你面前，剩下的自己体会。',
        ),
      ),
      envelopeOverview('就是翻到的那一条答案'),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '答案与问题无关。',
        fragments: text(
          '疑问只是首页那张卡片留给你的仪式感，它不参与抽取；同一句话连着翻两次，大概率会得到两个不同的回答。',
        ),
      },
    ],
  },
  requestSection({
    path,
    lead: para(
      ...frag`一行 ${'GET'} 就够了：不带参数、不带请求体，也不用登录。响应是 UTF-8 编码的 ${'application/json; charset=utf-8'}。`,
    ),
  }),
  paramsSection(
    undefined,
    {
      kind: 'callout',
      tone: 'warn',
      mark: '!',
      strong: '问题不必传给后端。',
      fragments: text('把疑问留在前端就好：服务端既不读取它，也无法根据它作答。'),
    },
    para(...text('没有参数。直接请求这个地址就是完整调用，疑问留在前端就好。')),
  ),
  responseSection(
    '翻到的那一条答案，字段见下方子行。',
    [
      {
        name: 'chinese',
        type: 'string',
        description: text('中文答案，短句居多，最短的一条只有一个字'),
        isChild: true,
      },
      {
        name: 'english',
        type: 'string',
        description: [
          { type: 'text', value: '与中文对应的英文。大小写风格没有统一：多数只句首大写（' },
          { type: 'code', value: 'Ask heaven and earth, ask yourself' },
          { type: 'text', value: '），也有逐词大写的（' },
          { type: 'code', value: 'Bet On It' },
          { type: 'text', value: '），句末一律不带标点。前端不要按某一种风格做断言或二次改写。' },
        ],
        isChild: true,
      },
    ],
    {
      kind: 'callout',
      tone: 'info',
      mark: 'i',
      strong: '没有 id，也没有 length。',
      fragments: text(
        'v1.0 时 data 里带过语料序号，v1.1 起删掉了；语料总数只写在文档里，接口本身不暴露。',
      ),
    },
    para(...text('响应体为 UTF-8 编码的统一 JSON 对象，单层信封，字段结构如下。')),
  ),
  headersSection({
    cache: text('随机接口默认不缓存；语料读进内存只是服务端自己的读取优化，不影响这条头。'),
    traceId: 'muyddp2t-76f2f24c',
  }),
  errorsSection(
    [
      METHOD_NOT_SUPPORTED_ROW,
      rateLimitedRow(text('按 Retry-After 退避，翻页交互请先做本地节流。')),
      {
        http: '500',
        statusCode: '500',
        label: '服务端内部错误',
        description: text('语料文件缺失或读出的内容为空'),
        suggestion: SERVER_ERROR_SUGGESTION,
      },
    ],
    {
      hasValidation: false,
      callout: {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '没有 400 / 404 / 422。',
        fragments: text('接口无参数，因此不存在取值非法、区间无解、校验失败这类分支；传入多余参数会被忽略。'),
      },
    },
  ),
  limitsSection([
    RATE_LIMIT_ROW,
    {
      item: '并发建议',
      limit: '≤ 2 QPS',
      description: text('批量场景请串行或合并请求，与默认阈值保持余量。'),
    },
    {
      item: '服务端缓存',
      limit: '未实现',
      description: text('响应本身不缓存，Cache-Control 为 no-store，也不下发 X-Cache。'),
    },
    {
      item: '客户端建议',
      limit: '≥ 30 s',
      description: text('首页卡片每翻一次就是一次真实请求，连点请在前端节流。'),
    },
    TIMEOUT_LIMIT_ROW,
  ]),
  changelogSection(
    [
      {
        date: '2026-10-08',
        version: 'v1.1',
        description: text('data 去掉 id，只剩 chinese 与 english；英文清洗 7 处（中英混排、撇号、拼写、多余省略号），另修正 1 处中文里混入英文标题的条目。'),
      },
      {
        date: '2026-10-08',
        version: 'v1.0',
        description: text('答案之书接口上线，随机返回一条中英对照答案。'),
      },
    ],
    {
      kind: 'callout',
      tone: 'info',
      mark: 'i',
      strong: 'v1.1 只动了语料，没动接口。',
      fragments: text('路径、方法、信封结构与限频阈值都和 v1.0 一致，旧调用不需要改。'),
    },
  ),
];


const requestPanes: CodePaneData[] = [
  {
    value: 'curl',
    label: 'cURL',
    lang: 'bash',
    code: `# 无参数，直接 GET 即可
curl "${url}"`,
  },
  {
    value: 'js',
    label: 'JavaScript',
    lang: 'js',
    code: `const res = await fetch("${url}");
const { statusCode, message, data, meta } = await res.json();

if (statusCode === 200) {
  console.log(data.chinese, "/", data.english);
  console.log("requestId:", meta.requestId, "site:", meta.site);
} else {
  console.error(message);
}`,
  },
  {
    value: 'py',
    label: 'Python',
    lang: 'py',
    code: `import requests

body = requests.get("${url}").json()
data, meta = body["data"], body["meta"]
print(data["chinese"], "/", data["english"], meta["requestId"])`,
  },
];

const responsePanes: CodePaneData[] = [
  successPane({
    label: '200 OK',
    requestId: 'muyddp2t-76f2f24c',
    serverTime: '2026-10-07T17:16:44.225Z',
    dataJson: `{
    "chinese": "下这一注稳赢",
    "english": "Bet On It"
  }`,
  }),
  failurePane({
    statusCode: 429,
    message: '请求过于频繁',
    requestId: 'muyddp2t-76f2f24c',
    serverTime: '2026-10-07T14:41:04.645Z',
    description: '请在 16 秒后重试',
    value: 'limit',
    trailingComment: '同时带响应头 Retry-After: 16（16 是这一窗口剩下的秒数，窗口本身 60 秒）',
  }),
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const answerbookDoc: AuthoredApiDoc = {
  eyebrow: 'Content API · v1',
  lede: '拿不定主意的时候翻一页，随机得到一句中英对照的答案。',
  facts: ['语料 360 条 · 中英对照', `限频 ${rateLimitText}`],
  metaRows: [
    { label: '当前版本', value: 'v1.1' },
    { label: '首版发布', value: '2026-10-08' },
    { label: '语料规模', value: '360 条' },
    { label: '鉴权', value: '无需' },
    { label: '限频', value: rateLimitText },
  ],
  sections,
  requestPanes,
  responsePanes,
};

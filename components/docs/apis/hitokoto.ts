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

const path = API.publicApi.hitokoto;
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(
        ...text('动漫也好、小说也好、网络也好，不论在哪里，我们总会看到有那么一两个句子能穿透你的心。'),
      ),
      envelopeOverview('即业务数据'),
    ],
  },
  requestSection({
    path,
    lead: para(
      ...frag` ${'GET'} 请求，无请求参数、无请求体、无需鉴权。字符编码统一为 UTF-8，响应为 ${'application/json; charset=utf-8'}。`,
    ),
  }),
  paramsSection(),
  responseSection(
    '一条短句对象，字段见下方子行。',
    [
      { name: 'content', type: 'string', description: text('句子正文，标点按语料原文保留'), isChild: true },
      { name: 'creator', type: 'string', description: text('作者或角色名。'), isChild: true },
      { name: 'source', type: 'string', description: text('出处（书名 / 篇名等）'), isChild: true },
    ],
    undefined,
    para(...text('响应体为 UTF-8 编码的统一 JSON 对象，单层信封，字段结构如下。')),
  ),
  headersSection({
    cache: text('随机接口默认不缓存；「同参数组合缓存 60 秒」为规划能力。'),
    traceId: 'muy8epbv-1e4189a2',
  }),
  errorsSection(
    [
      METHOD_NOT_SUPPORTED_ROW,
      rateLimitedRow(text('按 Retry-After 退避，并对结果做本地缓存。')),
      {
        http: '500',
        statusCode: '500',
        label: '服务端内部错误',
        description: text('语料文件 public/assets/json/hitokoto.json 缺失、内容为空或读不出来'),
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
    { item: '客户端建议', limit: '≥ 30 s', description: text('避免高频抖动与重复请求。') },
    TIMEOUT_LIMIT_ROW,
  ]),
  changelogSection([
    {
      date: '2026-10-07',
      version: 'v1.0',
      description: text('一言接口上线。'),
    },
  ]),
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
  console.log(data.content, "—", data.creator, "·", data.source);
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
print(data["content"], "—", data["creator"], "·", data["source"], meta["requestId"])`,
  },
];

const responsePanes: CodePaneData[] = [
  successPane({
    label: '200 OK',
    requestId: 'muy8epbv-1e4189a2',
    serverTime: '2026-10-07T14:57:33.433Z',
    dataJson: `{
    "content": "最是人间留不住，朱颜辞镜花辞树。",
    "creator": "王国维",
    "source": "蝶恋花·阅尽天涯离别苦"
  }`,
  }),
  failurePane({
    statusCode: 429,
    message: '请求过于频繁',
    requestId: 'muy8epbv-1e4189a2',
    serverTime: '2026-10-07T14:41:04.645Z',
    description: '请在 16 秒后重试',
    value: 'limit',
    trailingComment: '同时带响应头 Retry-After: 16（16 是这一窗口剩下的秒数，窗口本身 60 秒）',
  }),
];

export const hitokotoDoc: AuthoredApiDoc = {
  eyebrow: 'Content API · v1',
  lede: '动漫也好、小说也好、网络也好，不论在哪里，我们总会看到有那么一两个句子能穿透你的心。',
  facts: [`限频 ${rateLimitText}`],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-07' },
  ],
  sections,
  requestPanes,
  responsePanes,
};


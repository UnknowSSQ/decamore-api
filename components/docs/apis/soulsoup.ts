/** 接口文档内容；条数与长度区间均为 2026-10-10 实测（2,020 条逐条量过） */
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

const path = API.publicApi.soulsoup;
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(
        ...text(
          '正能量海报用久了需要换口味：一句反鸡汤，随机给，适合放在打卡、群公告和一切需要一句丧话的位置。',
        ),
      ),
      envelopeOverview('就是那一句'),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '没有参数，也不接受关键词。',
        fragments: text(
          '语料不按主题分类，所以也没有「给我一句关于加班的」这种用法；抽到哪句算哪句，想要合适的就多抽几次。',
        ),
      },
    ],
  },
  requestSection({ path }),
  paramsSection(),
  responseSection(
    '这一句毒鸡汤，字段见下方子行。',
    [
      {
        name: 'id',
        type: 'integer',
        description: text('语料内序号，1–2020 且唯一，可用来做「这句已经发过」的去重'),
        isChild: true,
      },
      {
        name: 'content',
        type: 'string',
        description: text('正文，实测 3–112 字，中位约 23 字，多数是一句完整的话'),
        isChild: true,
      },
    ],
    {
      kind: 'callout',
      tone: 'info',
      mark: 'i',
      strong: '语料的入库时间没有给你。',
      fragments: text(
        '上游数据带 created_at / updated_at 两列，那是这份数据的属性、不是这句话的，所以不进响应；要按时间排序请自己记。',
      ),
    },
  ),
  headersSection({
    cache: text('语料读一次常驻进程；随机结果每次都不同，所以响应一律 no-store。'),
    cacheExample: 'no-store, max-age=0',
    traceId: 'mv2fwoyt-0addc98f1ad5',
  }),
  errorsSection(
    [
      METHOD_NOT_SUPPORTED_ROW,
      rateLimitedRow(text('按 Retry-After 退避；一句丧话不值得高频抽。')),
      {
        http: '500',
        statusCode: '500',
        label: '语料读不出来',
        description: text('public/assets/json/soul.json 缺失、为空或解析失败'),
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
        fragments: text('接口无参数，因此不存在取值非法、区间无解、校验失败这类分支；多余的查询参数会被忽略。'),
      },
    },
  ),
  limitsSection([
    RATE_LIMIT_ROW,
    {
      item: '语料规模',
      limit: '2,020 条 / 373 KB',
      description: text('第一次请求读盘解析，之后走进程内缓存。'),
    },
    {
      item: '缓存实现',
      limit: '单进程内存表',
      description: text('语料不变，无需过期策略；换语料要重启进程。'),
    },
    {
      item: '重复概率',
      limit: '1 / 2,020',
      description: text('整份语料等概率抽一条，不加种子也不做轮转，所以连着抽会撞车；介意就自己记住出过的 id。'),
    },
    {
      item: '客户端建议',
      limit: '本地按天缓存',
      description: text('「每日一句」请在本地按日期存住当天那条，比每次进页面重抽更符合预期。'),
    },
    TIMEOUT_LIMIT_ROW,
  ]),
  changelogSection([
    {
      date: '2026-10-10',
      version: 'v1.0',
      description: text('毒鸡汤上线：2,020 条反鸡汤短句随机一句，无参数。'),
    },
  ]),
];

const requestPanes: CodePaneData[] = [
  {
    value: 'curl',
    label: 'cURL',
    lang: 'bash',
    code: `# 无参数，直接 GET
curl "${url}"`,
  },
  {
    value: 'js',
    label: 'JavaScript',
    lang: 'js',
    code: `const res = await fetch("${url}");
const { statusCode, message, data, meta } = await res.json();

if (statusCode === 200) {
  console.log(data.content, '—', data.id);
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

data = requests.get("${url}").json()["data"]
print(data["content"], "(#", data["id"], ")")`,
  },
];

const responsePanes: CodePaneData[] = [
  successPane({
    label: '200 OK',
    requestId: 'mv2fwoyt-0addc98f1ad5',
    serverTime: '2026-10-10T13:38:34.469Z',
    dataJson: `{
    "id": 1172,
    "content": "今天的我你爱答不理，明天的我还来找你～"
  }`,
  }),
  failurePane({
    statusCode: 429,
    message: '请求过于频繁',
    requestId: 'mv2gaygv-d7ef698b1d01',
    serverTime: '2026-10-10T13:49:39.967Z',
    description: '请在 21 秒后重试',
    trailingComment: '同时带响应头 Retry-After: 21（21 是这一窗口剩下的秒数，窗口本身 60 秒）',
  }),
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const soulsoupDoc: AuthoredApiDoc = {
  eyebrow: 'Content API · v1',
  lede: '2,020 句反鸡汤，随机一句，不上价值。',
  facts: ['2,020 条短句', '无参数，抽到哪句算哪句'],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-10' },
    { label: '语料', value: '2,020 条（3–112 字）' },
    { label: '服务端缓存', value: '无（语料常驻进程内存）' },
    { label: '限频', value: rateLimitText },
  ],
  sections,
  requestPanes,
  responsePanes,
};

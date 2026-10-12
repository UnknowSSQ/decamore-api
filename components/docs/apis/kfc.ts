/** 接口文档内容；条数与长度区间均为 2026-10-10 实测（424 条逐条量过） */
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

const path = API.publicApi.kfc;
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(
        ...text(
          '每周四群里总要有人发一段「谁 v 我 50」：这里存了 424 段现成的文案，抽一条直接发。',
        ),
      ),
      envelopeOverview('就是那段文案'),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '不限星期四。',
        fragments: text(
          '哪天要钱都算周四，服务端不做日期判断，非周四调用同样返回文案，也不会给你一个「今天不是周四」的错误。',
        ),
      },
    ],
  },
  requestSection({ path }),
  paramsSection(),
  responseSection(
    '这一段文案，字段见下方子行。',
    [
      {
        name: 'content',
        type: 'string',
        description: text('文案正文，实测 19–988 字、中位约 122 字，长度差别很大'),
        isChild: true,
      },
    ],
    {
      kind: 'callout',
      tone: 'warn',
      mark: '!',
      strong: '正文里有换行符。',
      fragments: text(
        '多数文案是分几行的段子，JSON 里以 \\n 传输。前端请按纯文本多行渲染（white-space: pre-line 即可），别当单行标题塞进 input。',
      ),
    },
  ),
  headersSection({
    cache: text('语料读一次常驻进程；随机结果每次都不同，响应一律 no-store。'),
    cacheExample: 'no-store, max-age=0',
    traceId: 'mv2fwp5q-cb7f36593e2e',
  }),
  errorsSection(
    [
      METHOD_NOT_SUPPORTED_ROW,
      rateLimitedRow(text('按 Retry-After 退避；一段文案发一次就够，不需要轮询。')),
      {
        http: '500',
        statusCode: '500',
        label: '语料读不出来',
        description: text('public/assets/json/kfc.json 缺失、为空或解析失败'),
        suggestion: SERVER_ERROR_SUGGESTION,
      },
    ],
    {
      hasValidation: false,
      callout: {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '响应里没有 id。',
        fragments: text(
          '语料是一个纯文本数组，序号只是文件顺序，换一版就会漂。所以这里不给你一个看着能用其实不能存的主键——想去重请按 content 本身。',
        ),
      },
    },
  ),
  limitsSection([
    RATE_LIMIT_ROW,
    {
      item: '语料规模',
      limit: '424 段 / 187 KB',
      description: text('第一次请求读盘解析，之后走进程内缓存。'),
    },
    {
      item: '缓存实现',
      limit: '单进程内存表',
      description: text('文案不变，无需过期策略；补新文案要重启进程才生效。'),
    },
    {
      item: '响应体积',
      limit: '约 60 B – 3 KB',
      description: text('按文案长度浮动，最长的一段接近千字，展示位请给一个能换行的容器而不是单行标签。'),
    },
    {
      item: '客户端建议',
      limit: '一次一段',
      description: text('做「每周四换一段」请在本地按周存住，别每次进页面都抽，否则同一周内会换好几轮。'),
    },
    TIMEOUT_LIMIT_ROW,
  ]),
  changelogSection([
    {
      date: '2026-10-10',
      version: 'v1.0',
      description: text('疯狂星期四文案上线：424 段现成文案随机一段，无参数、不限星期。'),
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
  // content 里带换行，按多行文本渲染
  console.log(data.content);
  console.log('字数：', data.content.length, 'requestId:', meta.requestId);
} else {
  console.error(message);
}`,
  },
  {
    value: 'py',
    label: 'Python',
    lang: 'py',
    code: `import requests

content = requests.get("${url}").json()["data"]["content"]
print(content)
print(len(content), "字")`,
  },
];

const responsePanes: CodePaneData[] = [
  successPane({
    label: '200 OK',
    requestId: 'mv2fwp5q-cb7f36593e2e',
    serverTime: '2026-10-10T13:38:34.718Z',
    dataJson: `{
    "content": "你明明就知道，\\n你知道一分钟有 60 秒，\\n知道我的每一秒都是关于你，\\n你知道万有引力法则，\\n知道我的宇宙中心不是太阳却是你，\\n你上知天文，下知地理，\\n通晓时空与我的爱意，\\n却不知道今天是肯德基疯狂星期四，\\n吮指原味鸡两块 9 块 9"
  }`,
  }),
  failurePane({
    statusCode: 429,
    message: '请求过于频繁',
    requestId: 'mv2gannd-6e9ffa252fed',
    serverTime: '2026-10-10T13:49:25.945Z',
    description: '请在 35 秒后重试',
    trailingComment: '同时带响应头 Retry-After: 35（35 是这一窗口剩下的秒数，窗口本身 60 秒）',
  }),
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const kfcDoc: AuthoredApiDoc = {
  eyebrow: 'Content API · v1',
  lede: '424 段疯狂星期四文案，随机一段，哪天要钱都算周四。',
  facts: ['424 段现成文案', '不限星期四'],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-10' },
    { label: '语料', value: '424 段（19–988 字）' },
    { label: '服务端缓存', value: '无（语料常驻进程内存）' },
    { label: '限频', value: rateLimitText },
  ],
  sections,
  requestPanes,
  responsePanes,
};

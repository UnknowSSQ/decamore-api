/** 接口文档内容；字段行为与数字均为 2026-10-10 实测（300 首语料逐条核过） */
import { API } from '@/lib/api/endpoints';
import { POEM_DYNASTY_HINT } from '@/lib/zod/public.schema';
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
  validationRow,
} from '../commonSections';
import type { AuthoredApiDoc, CodePaneData, DocSection } from '../types';

const path = API.publicApi.poetry;
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(
        ...text(
          '想要一句应景的诗，不必去翻全集：一次请求给一首，全文、白话译文和一句现代话都在里面。',
        ),
      ),
      envelopeOverview('就是那一首诗'),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '语料只有唐宋 300 首。',
        fragments: text(
          '这是一个精选集，不是全唐诗：唐 150 首、宋 150 首（南唐的五首按语料口径记在宋名下）。别指望在这里找到某首冷门的诗。',
        ),
      },
    ],
  },
  requestSection({ path }),
  paramsSection(
    [
      {
        name: 'dynasty',
        type: 'tang / song',
        required: 'no',
        defaultValue: '不传即两代一起抽',
        description: [
          { type: 'code', value: '?dynasty=' },
          { type: 'text', value: ' 只在这两值里取；URL 里不出现汉字，' },
          { type: 'code', value: 'song' },
          { type: 'text', value: ' 会连南唐一起抽到。' },
        ],
      },
    ],
    {
      kind: 'callout',
      tone: 'warn',
      mark: '!',
      strong: '传 tang 以外的写法直接 422。',
      fragments: text('「唐」、「TANG」、「tangs」都不收，这条参数的取值只有两个。'),
    },
  ),
  responseSection(
    '这一首诗，字段见下方子行。',
    [
      { name: 'id', type: 'string', description: text('语料内编号，p001–p300'), isChild: true },
      { name: 'title', type: 'string', description: text('诗题'), isChild: true },
      { name: 'author', type: 'string', description: text('作者'), isChild: true },
      { name: 'dynasty', type: 'string', description: text('粗分朝代，只有「唐」或「宋」'), isChild: true },
      {
        name: 'era',
        type: 'string',
        description: text('细分朝代，实测四种：唐、南唐、北宋、南宋'),
        isChild: true,
      },
      {
        name: 'genre',
        type: 'string',
        description: text('体裁，实测 82 种，五言律诗与词牌名混在一起'),
        isChild: true,
      },
      { name: 'lines', type: 'string[]', description: text('全文按句切分，实测 2–60 行'), isChild: true },
      {
        name: 'quote',
        type: 'string',
        description: text('常被单独引用的一句'),
        isChild: true,
      },
      { name: 'meaning', type: 'string', description: text('白话译文'), isChild: true },
      {
        name: 'realLife',
        type: 'string',
        description: text('语料配的现代语境一句话，分享场景直接用'),
        isChild: true,
      },
      { name: 'tags', type: 'string[]', description: text('题材标签，如「边塞」「送别」'), isChild: true },
      { name: 'blank', type: 'object', description: text('填字小题目，四个字段见下'), isChild: true },
      {
        name: 'prompt',
        type: 'string',
        description: text('完整的一句，index 那一格正是要挖空的字'),
        isChild: true,
      },
      { name: 'options', type: 'string[]', description: text('候选字，固定 5 个、不重复'), isChild: true },
      { name: 'answer', type: 'string', description: text('正确的那个字，必在 options 里'), isChild: true },
      { name: 'index', type: 'integer', description: text('空位在 prompt 里的下标，实测 0–8'), isChild: true },
    ],
    {
      kind: 'callout',
      tone: 'info',
      mark: 'i',
      strong: '名句不一定原样出现在 lines 里。',
      fragments: text(
        '300 首里有 20 首的 quote 与 lines 不逐字重合（跨行断句所致）。要展示全文就渲染 lines，别拿 quote 当校验。',
      ),
    },
  ),
  headersSection({
    cache: text('语料读一次就常驻进程，响应本身不缓存，所以是 no-store；随机接口给缓存头也没有意义，同一份缓存会让「换一首」失效。'),
    cacheExample: 'no-store, max-age=0',
    traceId: 'mv2fwol1-4a712214edbf',
  }),
  errorsSection(
    [
      METHOD_NOT_SUPPORTED_ROW,
      validationRow({
        label: '朝代不合法',
        message: POEM_DYNASTY_HINT,
        field: 'dynasty',
        suggestion: text('取值只有这两个；想两代一起抽就干脆别传。'),
      }),
      rateLimitedRow(text('按 Retry-After 歇一会儿；诗不会跑掉。')),
      {
        http: '500',
        statusCode: '500',
        label: '语料读不出来',
        description: text('public/assets/json/poems.json 缺失、为空或解析失败'),
        suggestion: SERVER_ERROR_SUGGESTION,
      },
    ],
    {
      hasValidation: true,
      callout: {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '没有 404。',
        fragments: text('接口不接受 id 参数，抽到哪首就是哪首，所以不存在「这首诗找不到」这回事。'),
      },
    },
  ),
  limitsSection([
    RATE_LIMIT_ROW,
    {
      item: '语料规模',
      limit: '300 首 / 403 KB',
      description: text('启动后第一次请求读盘解析，之后走进程内缓存，不再碰磁盘。'),
    },
    {
      item: '缓存实现',
      limit: '单进程内存表',
      description: text('语料本身不随时间变化，多实例各自读同一份文件即可，无需外部缓存。'),
    },
    {
      item: '响应体积',
      limit: '约 1–6 KB',
      description: text('按行数浮动：抽到琵琶行这类长篇会明显变大，做列表页时别一次并发十几首。'),
    },
    {
      item: '客户端建议',
      limit: '一次一首',
      description: text('要「今日一诗」就在本地按日期存 24 小时，比反复抽更稳，也更像每天换一次。'),
    },
    TIMEOUT_LIMIT_ROW,
  ]),
  changelogSection([
    {
      date: '2026-10-10',
      version: 'v1.0',
      description: text('古诗词上线：唐宋 300 首随机一首，返回全文、白话译文、现代语境一句话与填字小题目，可按 dynasty 筛。'),
    },
  ]),
];

const requestPanes: CodePaneData[] = [
  {
    value: 'curl',
    label: 'cURL',
    lang: 'bash',
    code: `# 不传参数：唐宋一起抽
curl "${url}"

# 只在宋诗里抽
curl "${url}?dynasty=song"`,
  },
  {
    value: 'js',
    label: 'JavaScript',
    lang: 'js',
    code: `const res = await fetch("${url}");
const { statusCode, message, data, meta } = await res.json();

if (statusCode === 200) {
  console.log(\`\${data.title} — \${data.author}（\${data.era}·\${data.genre}）\`);
  for (const line of data.lines) console.log(line);
  console.log('译文：', data.meaning);
  console.log('今天的话：', data.realLife);

  // 填字：把 index 那一格遮起来当空，选项在 options 里
  const blank = data.blank;
  console.log(blank.prompt, blank.options.join(' / '), '→ 答案是', blank.answer);
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
print(data["title"], data["author"], data["era"], sep=" — ")
print("\\n".join(data["lines"]))
print(data["quote"], data["tags"])

b = data["blank"]
print(b["prompt"], b["options"], "answer:", b["answer"], "at", b["index"])`,
  },
];

const responsePanes: CodePaneData[] = [
  successPane({
    label: '200 OK',
    requestId: 'mv2fwol1-4a712214edbf',
    serverTime: '2026-10-10T13:38:33.973Z',
    dataJson: `{
    "id": "p233",
    "title": "小池",
    "author": "杨万里",
    "dynasty": "宋",
    "era": "南宋",
    "genre": "七言绝句",
    "lines": [
      "泉眼无声惜细流，树阴照水爱晴柔。",
      "小荷才露尖尖角，早有蜻蜓立上头。"
    ],
    "quote": "小荷才露尖尖角，早有蜻蜓立上头。",
    "meaning": "泉眼悄无声息，像是珍惜那一涓细流；树影斜照水面，像是爱恋这晴日的温柔。小荷叶刚从水里冒出一个尖尖角，早有一只蜻蜓静静立在上头。",
    "realLife": "新入职的小同学刚露头，早就被 HR 在小本本上记了一笔。",
    "tags": ["初夏", "小景", "童趣"],
    "blank": {
      "prompt": "早有蜻蜓立上头",
      "options": ["停", "落", "栖", "立", "站"],
      "answer": "立",
      "index": 4
    }
  }`,
  }),
  failurePane({
    statusCode: 422,
    message: POEM_DYNASTY_HINT,
    requestId: 'mv2fwpd3-dd8f803f704b',
    serverTime: '2026-10-10T13:38:34.983Z',
    description: `dynasty：${POEM_DYNASTY_HINT}`,
    issues: [{ field: 'dynasty', message: POEM_DYNASTY_HINT, code: 'invalid_type' }],
  }),
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const poetryDoc: AuthoredApiDoc = {
  eyebrow: 'Content API · v1',
  lede: '唐宋 300 首里随机一首，全文、译文和一句现代话一起给。',
  facts: ['300 首，唐 150 / 宋 150', '一次一首，含填字小题目'],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-10' },
    { label: '语料', value: '300 首（唐 150 · 宋 150）' },
    { label: '服务端缓存', value: '无（语料常驻进程内存）' },
    { label: '限频', value: rateLimitText },
  ],
  sections,
  requestPanes,
  responsePanes,
};

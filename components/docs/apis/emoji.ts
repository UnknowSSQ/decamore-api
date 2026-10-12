/** 接口文档内容；字段行为与数字均为 2026-10-08 实测 */
import { API } from '@/lib/api/endpoints';
import { EMOJI_TYPE_HINT } from '@/lib/zod/public.schema';
import { para, text } from '../fragments';
import { apiUrl } from '../url';
import {
  CACHE_IMPL_ROW,
  METHOD_NOT_SUPPORTED_ROW,
  RATE_LIMIT_ROW,
  TIMEOUT_LIMIT_ROW,
  changelogSection,
  envelopeOverview,
  errorsSection,
  failurePane,
  headersSection,
  limitsSection,
  paramsSection,
  rateLimitedRow,
  rateLimitText,
  requestSection,
  responseSection,
  successPane,
  validationRow,
} from '../commonSections';
import type { AuthoredApiDoc, CodePaneData, DocSection } from '../types';

const path = API.publicApi.emoji;
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(...text('站内表情包目录：一次请求拿到该类型下全部贴图的文件名、格式、大小和访问地址。')),
      envelopeOverview('是一份文件清单'),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '可选的 type 只有 menhera。',
        fragments: text('往 public/assets/emoji 下加一个新目录，type 的可选值才会多一个；现在只有 menhera 一个目录。'),
      },
    ],
  },
  requestSection({ path }),
  paramsSection(
    [
      {
        name: 'type',
        type: 'menhera',
        required: 'no',
        defaultValue: 'menhera',
        description: [
          { type: 'code', value: '?type=' },
          { type: 'text', value: '留空或不传时给 menhera；' },
        ],
      },
      {
        name: 'limit',
        type: 'integer',
        required: 'no',
        defaultValue: '不传为全量',
        description: [
          { type: 'text', value: '随机取 ' },
          { type: 'code', value: 'N 条' },
          { type: 'text', value: '（目录本身无序，服务端洗牌后再截，所以每次结果不同）；' },
          { type: 'code', value: 'total' },
          { type: 'text', value: ' 仍是目录全量。取值 1–100。' },
        ],
      },
    ],
    {
      kind: 'callout',
      tone: 'warn',
      mark: '!',
      strong: '写错的类别不会被换成 menhera 塞给你。',
      fragments: text('?type=dog 直接返回 422'),
    },
  ),
  responseSection(
    '这一类的文件清单。',
    [
      { name: 'type', type: 'string', description: text('命中的类型，也就是目录名。'), isChild: true },
      { name: 'total', type: 'integer', description: text('可用文件数，实测 menhera 是 117'), isChild: true },
      {
        name: 'cached',
        type: 'boolean',
        description: text('命中 10 分钟缓存时为 true'),
        isChild: true,
      },
      { name: 'items', type: 'array', description: text('文件列表，按文件名排序'), isChild: true },
      { name: 'id', type: 'string', description: text('文件名去掉扩展名，当缓存键用它'), isChild: true },
      { name: 'file', type: 'string', description: text('文件名原文（含扩展名）'), isChild: true },
      { name: 'format', type: 'string', description: text('扩展名小写，目前全是 jpg'), isChild: true },
      { name: 'size', type: 'integer | null', description: text('文件字节数，单张 18–93 KB'), isChild: true },
      { name: 'url', type: 'string', description: text('绝对访问地址，直接给 img.src'), isChild: true },
      { name: 'thumbUrl', type: 'string', description: text('448px 宽的 webp 派生图，1.7–9.8 KB'), isChild: true },
    ],
    {
      kind: 'callout',
      tone: 'info',
      mark: 'i',
      strong: '接口给清单，不给「随机一张」。',
      fragments: text('整份清单实测 17 KB，抓一次存本地，抽哪张自己决定。'),
    },
  ),
  headersSection({
    cache: text('接口响应不缓存；图片本体走站内静态资源'),
    traceId: 'muzih0k1-2c4a77de',
  }),
  errorsSection(
    [
      METHOD_NOT_SUPPORTED_ROW,
      validationRow({
        label: '参数不合法',
        message: EMOJI_TYPE_HINT,
        field: 'type',
        suggestion: text('按现有类别传值；想省事就一个都不传。'),
      }),
      rateLimitedRow(text('清单一次就能拿全，没必要反复要。')),
      {
        http: '500',
        statusCode: '500',
        label: '资源不可用',
        description: text('message 为「表情包资源不可用」，description 会指出是哪个目录空了或不存在'),
        suggestion: text('确认 public/assets/emoji/<type> 里有图片文件。'),
      },
    ],
    {
      hasValidation: true,
      callout: {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '没有 404。',
        fragments: text('接口不针对单个文件，清单为空时直接 500 说清原因，而不是回一个 items: [] 让你猜。'),
      },
    },
  ),
  limitsSection([
    RATE_LIMIT_ROW,
    {
      item: '目录缓存',
      limit: '10 分钟 / 每类型',
      description: text('每个类型各存一份清单，命中时 cached=true；'),
    },
    CACHE_IMPL_ROW,
    {
      item: '新资源生效',
      limit: '最长 10 分钟',
      description: text('往目录里丢新图不用重启，但也要等缓存过期才会进清单。'),
    },
    TIMEOUT_LIMIT_ROW,
  ]),
  changelogSection([
    {
      date: '2026-10-08',
      version: 'v1.0',
      description: text('表情包接口上线：返回 menhera 类的贴图清单与访问地址，目录列表服务端缓存 10 分钟。'),
    },
  ]),
];


const requestPanes: CodePaneData[] = [
  {
    value: 'curl',
    label: 'cURL',
    lang: 'bash',
    code: `# 目前只有一类，不传即可
curl "${url}"

# 显式指定
curl "${url}?type=menhera"`,
  },
  {
    value: 'js',
    label: 'JavaScript',
    lang: 'js',
    code: `const res = await fetch("${url}");
const { statusCode, message, data } = await res.json();

if (statusCode === 200) {
  console.log(data.type, data.total + " 张", "cached:", data.cached);
  const pick = data.items[Math.floor(Math.random() * data.items.length)];
  console.log(pick.file, pick.format, pick.size + "B", pick.url);
} else {
  console.error(message);
}`,
  },
  {
    value: 'py',
    label: 'Python',
    lang: 'py',
    code: `import random
import requests

data = requests.get("${url}").json()["data"]
print(data["type"], data["total"], "cached:", data["cached"])
print(random.choice(data["items"])["url"])`,
  },
];

const responsePanes: CodePaneData[] = [
  successPane({
    label: '200 · menhera',
    requestId: 'muzih0k1-2c4a77de',
    serverTime: '2026-10-08T12:41:07.221Z',
    dataJson: `{
    "type": "menhera",
    "total": 117,
    "cached": false,
    "items": [
      {
        "id": "002449da659a",
        "file": "002449da659a.jpg",
        "format": "jpg",
        "size": 53644,
        "url": "http://localhost:3000/assets/emoji/menhera/002449da659a.jpg",
        "thumbUrl": "http://localhost:3000/assets/emoji-thumb/menhera/002449da659a.webp"
      },
      {
        "id": "02a94c2f761e",
        "file": "02a94c2f761e.jpg",
        "format": "jpg",
        "size": 30501,
        "url": "http://localhost:3000/assets/emoji/menhera/02a94c2f761e.jpg",
        "thumbUrl": "http://localhost:3000/assets/emoji-thumb/menhera/02a94c2f761e.webp"
      }
      // … 共 117 条，按文件名排序
    ]
  }`,
  }),
  failurePane({
    statusCode: 422,
    message: EMOJI_TYPE_HINT,
    requestId: 'muzih1zx-9b23ce40',
    serverTime: '2026-10-08T12:41:07.551Z',
    description: `type：${EMOJI_TYPE_HINT}`,
    issues: [
      { field: 'type', message: EMOJI_TYPE_HINT, code: 'invalid_type' },
    ],
  }),
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const emojiDoc: AuthoredApiDoc = {
  eyebrow: 'Image API · v1',
  lede: '手里没表情包的时候，来这份清单里挑',
  facts: ['目前 menhera 一类，117 张', '目录清单缓存 10 分钟'],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-08' },
    { label: '类型', value: 'menhera' },
    { label: '资源规模', value: '117 张 jpg · 单张 18–93 KB' },
    { label: '限频', value: rateLimitText },
  ],
  sections,
  requestPanes,
  responsePanes,
};

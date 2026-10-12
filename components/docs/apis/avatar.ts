/** 接口文档内容；字段行为与数字均为 2026-10-08 实测 */
import { API } from '@/lib/api/endpoints';
import { AVATAR_TYPE_HINT } from '@/lib/zod/public.schema';
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

const path = API.publicApi.avatar;
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(...text('站内头像目录按类型摊开：男生、女生、动漫三份清单，每条带文件名、格式、大小和访问地址。')),
      envelopeOverview('是一份文件清单'),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '一次只给一类的清单。',
        fragments: text('type 是单选，没有 all；三类各 16 张，都要就发三次请求。'),
      },
    ],
  },
  requestSection({ path }),
  paramsSection(
    [
      {
        name: 'type',
        type: 'boy / girl / anime',
        required: 'no',
        defaultValue: 'boy',
        description: [
          { type: 'code', value: '?type=' },
          { type: 'text', value: '留空或不传时给 boy；' },
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
      strong: '没有 dog 这一类。',
      fragments: text('?type=dog 直接返回 422，不会拿别的类型凑数。'),
    },
  ),
  responseSection(
    '这一类的文件清单。',
    [
      { name: 'type', type: 'string', description: text('命中的类型，也就是目录名。'), isChild: true },
      { name: 'total', type: 'integer', description: text('可用文件数，三类都是 16'), isChild: true },
      {
        name: 'cached',
        type: 'boolean',
        description: text('命中 10 分钟缓存时为 true'),
        isChild: true,
      },
      { name: 'items', type: 'array', description: text('文件列表，按文件名排序'), isChild: true },
      { name: 'id', type: 'string', description: text('文件名去掉扩展名，当缓存键用它'), isChild: true },
      { name: 'file', type: 'string', description: text('文件名原文（含扩展名）'), isChild: true },
      {
        name: 'format',
        type: 'string',
        description: text('扩展名小写。boy / girl 全是 jpg，anime 是 11 张 jpg + 5 张 webp'),
        isChild: true,
      },
      {
        name: 'size',
        type: 'integer | null',
        description: text('文件字节数。boy 43–154 KB、girl 72–219 KB、anime 14–81 KB'),
        isChild: true,
      },
      {
        name: 'url',
        type: 'string',
        description: text('绝对访问地址，直接给 img.src。三类都是方图，套圆形容器只切掉一点点边'),
        isChild: true,
      },
      {
        name: 'thumbUrl',
        type: 'string',
        description: text('224px 宽的 webp 派生图，1.6–9.6 KB；原图单张约 100 KB，小尺寸展示位优先用它'),
        isChild: true,
      },
    ],
    {
      kind: 'callout',
      tone: 'info',
      mark: 'i',
      strong: '一个条目两个地址。',
      fragments: text('url 是原图，thumbUrl 是它 224px 宽的派生图；铺头像墙时用后者，原图留给要看清细节的那一下。'),
    },
  ),
  headersSection({
    cache: text('接口响应不缓存；图片走站内静态资源'),
    traceId: 'muziizq2-51ab70cf',
  }),
  errorsSection(
    [
      METHOD_NOT_SUPPORTED_ROW,
      validationRow({
        label: '参数不合法',
        message: AVATAR_TYPE_HINT,
        field: 'type',
        suggestion: text('三类之一；想省事就一个都不传，走 boy。'),
      }),
      rateLimitedRow(text('清单很小也不常变，抓一次存本地就够。')),
      {
        http: '500',
        statusCode: '500',
        label: '资源不可用',
        description: text('message 为「头像资源不可用」，description 会指出是哪个目录空了或不存在'),
        suggestion: text('确认 public/assets/avatar/<type> 里有图片文件。'),
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
      description: text('三类各存一份清单，命中时 cached=true；'),
    },
    CACHE_IMPL_ROW,
    {
      item: '新资源生效',
      limit: '最长 10 分钟',
      description: text('往目录里补图不用重启，但也要等缓存过期才会进清单。'),
    },
    TIMEOUT_LIMIT_ROW,
  ]),
  changelogSection([
    {
      date: '2026-10-08',
      version: 'v1.0',
      description: text('头像接口上线：boy / girl / anime 三类清单与访问地址，目录列表服务端缓存 10 分钟。'),
    },
  ]),
];


const requestPanes: CodePaneData[] = [
  {
    value: 'curl',
    label: 'cURL',
    lang: 'bash',
    code: `# 不传 type：默认 boy
curl "${url}"

curl "${url}?type=boy"
curl "${url}?type=girl"
curl "${url}?type=anime"`,
  },
  {
    value: 'js',
    label: 'JavaScript',
    lang: 'js',
    code: `const res = await fetch("${url}?type=anime");
const { statusCode, message, data } = await res.json();

if (statusCode === 200) {
  console.log(data.type, data.total + " 张", "cached:", data.cached);
  for (const item of data.items.slice(0, 5)) {
    console.log(item.id, item.format, item.size + "B");
  }
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

data = requests.get("${url}", params={"type": "girl"}).json()["data"]
print(data["type"], data["total"], "cached:", data["cached"])
print(random.choice(data["items"])["url"])`,
  },
];

const responsePanes: CodePaneData[] = [
  successPane({
    label: '200 · anime',
    requestId: 'muziizq2-51ab70cf',
    serverTime: '2026-10-08T12:47:33.508Z',
    dataJson: `{
    "type": "anime",
    "total": 16,
    "cached": false,
    "items": [
      {
        "id": "0178b57a2cc6e825",
        "file": "0178b57a2cc6e825.webp",
        "format": "webp",
        "size": 20754,
        "url": "http://localhost:3000/assets/avatar/anime/0178b57a2cc6e825.webp",
        "thumbUrl": "http://localhost:3000/assets/avatar-thumb/anime/0178b57a2cc6e825.webp"
      },
      {
        "id": "06903becd9d0f15f",
        "file": "06903becd9d0f15f.jpg",
        "format": "jpg",
        "size": 71442,
        "url": "http://localhost:3000/assets/avatar/anime/06903becd9d0f15f.jpg",
        "thumbUrl": "http://localhost:3000/assets/avatar-thumb/anime/06903becd9d0f15f.webp"
      }
      // … 共 16 条（11 张 jpg + 5 张 webp）
    ]
  }`,
  }),
  failurePane({
    statusCode: 422,
    message: AVATAR_TYPE_HINT,
    requestId: 'muzij0ar-7cc2f1e8',
    serverTime: '2026-10-08T12:47:33.621Z',
    description: `type：${AVATAR_TYPE_HINT}`,
    issues: [
      { field: 'type', message: AVATAR_TYPE_HINT, code: 'invalid_type' },
    ],
  }),
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const avatarDoc: AuthoredApiDoc = {
  eyebrow: 'Image API · v1',
  lede: '注册页要挑个默认头像，三份现成的清单',
  facts: ['boy / girl / anime 三类，各 16 张', '目录清单缓存 10 分钟'],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-08' },
    { label: '类型', value: 'boy · girl · anime' },
    { label: '资源规模', value: '每类 16 张（anime 含 5 张 webp）' },
    { label: '限频', value: rateLimitText },
  ],
  sections,
  requestPanes,
  responsePanes,
};

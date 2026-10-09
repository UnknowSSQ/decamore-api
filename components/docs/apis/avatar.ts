/** 接口文档内容；字段行为与数字均为 2026-10-08 实测 */
import { frag, para, text } from '../fragments';
import { apiUrl } from '../url';
import { headersSection } from '../commonSections';
import type { AuthoredApiDoc, CodePaneData, DocSection } from '../types';

const path = '/api/v1/avatar';
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(...text('站内头像目录按类型摊开：男生、女生、动漫三份清单，每条带文件名、格式、大小和访问地址。')),
      para(
        ...frag`对外接口返回单层信封 ${'{ statusCode, message, data, meta }'}：${'data'} 是一份文件清单，${'meta'} 收敛调用元信息（${'requestId'} / ${'serverTime'} / ${'site'}）。其中 ${'requestId'} 与响应头 ${'x-trace-id'} 同值，反馈问题时提供它即可定位到服务端日志。`,
      ),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '一次只给一类的清单。',
        fragments: text('type 是单选，没有 all；三类各 16 张，都要就发三次请求。'),
      },
    ],
  },
  {
    id: 'request',
    title: '请求方式',
    content: [
      {
        kind: 'table',
        variant: 'request',
        rows: [
          { item: '请求方法', value: 'GET', description: [
            { type: 'text', value: '其他方法由框架直接返回 ' },
            { type: 'code', value: '405' },
            { type: 'text', value: '（无响应体，不经过业务信封）' },
          ]},
          { item: '站内路径', value: '/api/v1/avatar', description: text('同源页面可直接相对路径调用') },
          { item: '协议', value: 'HTTP / HTTPS', description: text('/') },
          { item: '鉴权', value: '无需', description: text('匿名可调用，按 IP 限频')  },
          { item: 'Content-Type', value: '—', description: text('无请求体，无需设置') },
        ],
      },
    ],
  },
  {
    id: 'params',
    title: '请求参数',
    content: [
      {
        kind: 'table',
        variant: 'params',
        rows: [
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
        ],
      },
      {
        kind: 'callout',
        tone: 'warn',
        mark: '!',
        strong: '没有 dog 这一类。',
        fragments: text('?type=dog 直接返回 422，不会拿别的类型凑数。'),
      },
    ],
  },
  {
    id: 'response',
    title: '返回参数',
    content: [
      {
        kind: 'table',
        variant: 'response',
        rows: [
          {
            name: 'statusCode',
            type: 'integer',
            description: [
              { type: 'text', value: '业务状态码，成功固定为 ' },
              { type: 'code', value: '200' },
              { type: 'text', value: '；失败响应结构见「错误码」。' },
            ],
          },
          { name: 'message', type: 'string', description: text('结果描述，成功时为 success。') },
          { name: 'data', type: 'object', description: text('这一类的文件清单。') },
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
          { name: 'meta', type: 'object', description: text('调用元信息，用于日志检索与时序判断。') },
          {
            name: 'requestId',
            type: 'string',
            description: [
              { type: 'text', value: '请求追踪 ID，与响应头 ' },
              { type: 'code', value: 'x-trace-id' },
              { type: 'text', value: ' 同值，反馈问题时请一并提供。' },
            ],
            isChild: true,
          },
          {
            name: 'serverTime',
            type: 'string',
            description: [{ type: 'text', value: '服务端生成响应的 ISO 8601 时间（UTC）' }],
            isChild: true,
          },
          { name: 'site', type: 'string', description: text('站点名称'), isChild: true },
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '没有缩略图，也没有 64×64 版本。',
        fragments: text('清单里的地址就是原图，一次铺几十个头像时自己做懒加载。'),
      },
    ],
  },
  headersSection({
    cache: text('接口响应不缓存；图片走站内静态资源'),
    traceId: 'muziizq2-51ab70cf',
  }),
  {
    id: 'errors',
    title: '错误码',
    content: [
      para(
        ...frag`失败响应使用控制台的错误信封 ${'{ statusCode, success:false, message, description?, data: null, meta:{ timestamp, traceId } }'}`,
      ),
      {
        kind: 'table',
        variant: 'errors',
        rows: [
          {
            http: '405',
            statusCode: '—',
            label: '方法不支持',
            description: text('由框架直接返回，响应体为空'),
            suggestion: text('使用 GET 请求。'),
          },
          {
            http: '422',
            statusCode: '422',
            label: '参数不合法',
            description: [
              { type: 'text', value: 'message 为「type 只能是 boy、girl 或 anime」，并带 ' },
              { type: 'code', value: 'issues' },
              { type: 'text', value: ' 指明是 type 字段。' },
            ],
            suggestion: text('三类之一；想省事就一个都不传，走 boy。'),
          },
          {
            http: '429',
            statusCode: '429',
            label: '频率限制',
            description: [
              { type: 'text', value: 'message 为「请求过于频繁」，description 为「请在 N 秒后重试」，并带 ' },
              { type: 'code', value: 'Retry-After' },
              { type: 'text', value: ' 头。窗口固定 60 秒。' },
            ],
            suggestion: text('清单很小也不常变，抓一次存本地就够。'),
          },
          {
            http: '500',
            statusCode: '500',
            label: '资源不可用',
            description: text('message 为「头像资源不可用」，description 会指出是哪个目录空了或不存在'),
            suggestion: text('确认 public/assets/avatar/<type> 里有图片文件。'),
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '没有 404。',
        fragments: text('接口不针对单个文件，清单为空时直接 500 说清原因，而不是回一个 items: [] 让你猜。'),
      },
    ],
  },
  {
    id: 'limits',
    title: '速率与缓存',
    content: [
      {
        kind: 'table',
        variant: 'limits',
        rows: [
          {
            item: '调用频率',
            limit: '120 次 / 分钟 / IP',
            description: [
              { type: 'text', value: '按「IP + 方法 + 路径」固定窗口计数（窗口 60 秒），阈值取自环境变量 ' },
              { type: 'code', value: 'RATE_LIMIT_PER_MIN' },
              { type: 'text', value: '，默认 120；超限返回 ' },
              { type: 'code', value: '429' },
              { type: 'text', value: ' 与 Retry-After 头。三类共用同一份配额。' },
            ],
          },
          {
            item: '目录缓存',
            limit: '10 分钟 / 每类型',
            description: text('三类各存一份清单，命中时 cached=true；'),
          },
          {
            item: '缓存实现',
            limit: '进程内存',
            description: text('单进程内存表'),
          },
          {
            item: '新资源生效',
            limit: '最长 10 分钟',
            description: text('往目录里补图不用重启，但也要等缓存过期才会进清单。'),
          },
          {
            item: '超时与重试',
            limit: '建议 3 s / 1 次',
            description: [
              { type: 'text', value: '纯本地扫盘，没有上游；客户端只对 ' },
              { type: 'code', value: '5xx' },
              { type: 'text', value: ' 与网络错误重试，' },
              { type: 'code', value: '4xx' },
              { type: 'text', value: ' 不重试。' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'changelog',
    title: '更新日志',
    content: [
      {
        kind: 'table',
        variant: 'changelog',
        rows: [
          {
            date: '2026-10-08',
            version: 'v1.0',
            description: text('头像接口上线：boy / girl / anime 三类清单与访问地址，目录列表服务端缓存 10 分钟。'),
          },
        ],
      },
    ],
  },
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
  {
    value: 'ok',
    label: '200 · anime',
    lang: 'json',
    code: `{
  "statusCode": 200,
  "message": "success",
  "data": {
    "type": "anime",
    "total": 16,
    "cached": false,
    "items": [
      {
        "id": "0178b57a2cc6e825",
        "file": "0178b57a2cc6e825.webp",
        "format": "webp",
        "size": 20754,
        "url": "http://localhost:3000/assets/avatar/anime/0178b57a2cc6e825.webp"
      },
      {
        "id": "06903becd9d0f15f",
        "file": "06903becd9d0f15f.jpg",
        "format": "jpg",
        "size": 71442,
        "url": "http://localhost:3000/assets/avatar/anime/06903becd9d0f15f.jpg"
      }
      // … 共 16 条（11 张 jpg + 5 张 webp）
    ]
  },
  "meta": {
    "requestId": "muziizq2-51ab70cf",
    "serverTime": "2026-10-08T12:47:33.508Z",
    "site": "Decamore API"
  }
}`,
  },
  {
    value: 'invalid',
    label: '422',
    lang: 'json',
    code: `{
  "statusCode": 422,
  "success": false,
  "message": "type 只能是 boy、girl 或 anime",
  "description": "type：type 只能是 boy、girl 或 anime",
  "issues": [
    { "field": "type", "message": "type 只能是 boy、girl 或 anime", "code": "invalid_type" }
  ],
  "data": null,
  "meta": {
    "timestamp": 1791463653621,
    "traceId": "muzij0ar-7cc2f1e8"
  }
}`,
  },
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
    { label: '限频', value: '120 次 / 分钟 / IP' },
  ],
  sections,
  requestPanes,
  responsePanes,
};

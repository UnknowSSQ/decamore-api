/** 接口文档内容；字段行为与数字均为 2026-10-08 实测 */
import { frag, para, text } from '../fragments';
import { apiUrl } from '../url';
import type { ApiDoc, CodePaneData, DocSection } from '../types';

const path = '/api/v1/images';
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(...text('站内人像图库按目录摊开：beauty 与 pretty 两份清单，每条带文件名、格式、大小和访问地址。')),
      para(
        ...frag`对外接口返回单层信封 ${'{ statusCode, message, data, meta }'}：${'data'} 是一份文件清单，${'meta'} 收敛调用元信息（${'requestId'} / ${'serverTime'} / ${'site'}）。其中 ${'requestId'} 与响应头 ${'x-trace-id'} 同值，反馈问题时提供它即可定位到服务端日志。`,
      ),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '两组清单没有重复。',
        fragments: text('beauty 与 pretty 各 16 张，按文件名与字节都比对过；区别只到目录名为止，接口不带标签、不带 EXIF。'),
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
          { name: '请求方法', type: 'GET', description: [
            { type: 'text', value: '其他方法由框架直接返回 ' },
            { type: 'code', value: '405' },
            { type: 'text', value: '（无响应体，不经过业务信封）' },
          ]},
          { name: '站内路径', type: '/api/v1/images', description: text('同源页面可直接相对路径调用') },
          { name: '协议', type: 'HTTP / HTTPS', description: text('/') },
          { name: '鉴权', type: '无需', description: text('匿名可调用，按 IP 限频'), required: 'na' },
          { name: 'Content-Type', type: '—', description: text('无请求体，无需设置') },
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
            type: 'beauty / pretty',
            required: 'no',
            defaultValue: 'beauty',
            description: [
              { type: 'code', value: '?type=' },
              { type: 'text', value: '留空或不传时给 beauty；' },
            ],
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'warn',
        mark: '!',
        strong: '没有 all 这个取值。',
        fragments: text('?type=cute 直接返回 422；两组都要就发两次请求。'),
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
          { name: 'data', type: 'object', description: text('这一组的文件清单。') },
          { name: 'type', type: 'string', description: text('命中的类型，也就是目录名。'), isChild: true },
          { name: 'total', type: 'integer', description: text('可用文件数，两组都是 16'), isChild: true },
          {
            name: 'cached',
            type: 'boolean',
            description: text('命中 10 分钟缓存时为 true'),
            isChild: true,
          },
          { name: 'items', type: 'array', description: text('文件列表，按文件名排序'), isChild: true },
          { name: 'id', type: 'string', description: text('文件名去掉扩展名，当缓存键用它'), isChild: true },
          { name: 'file', type: 'string', description: text('文件名原文（含扩展名）'), isChild: true },
          { name: 'format', type: 'string', description: text('扩展名小写，两组全是 jpg'), isChild: true },
          {
            name: 'size',
            type: 'integer | null',
            description: text('文件字节数。beauty 79–389 KB、pretty 85–289 KB'),
            isChild: true,
          },
          { name: 'url', type: 'string', description: text('绝对访问地址，直接给 img.src'), isChild: true },
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
        strong: '清单不含宽高，画幅要自己量。',
        fragments: text('两组都以人像竖幅为主（16 张里 14 张竖幅），铺版式时按 object-fit: cover 兜一下比较稳。'),
      },
    ],
  },
  {
    id: 'headers',
    title: '响应头',
    content: [
      {
        kind: 'table',
        variant: 'headers',
        rows: [
          {
            name: 'Content-Type',
            type: '',
            example: 'application/json; charset=utf-8',
            description: text('固定为 JSON，不支持 JSONP；图片本体是 image/jpeg。'),
          },
          {
            name: 'Cache-Control',
            type: '',
            example: 'no-store, max-age=0',
            description: text('接口响应不缓存；图片走站内静态资源'),
          },
          {
            name: 'x-trace-id',
            type: '',
            example: 'muzk84b1-e2753470',
            description: [
              { type: 'text', value: '与 ' },
              { type: 'code', value: 'requestId' },
              { type: 'text', value: ' 同值，用于日志检索。' },
            ],
          },
          {
            name: 'x-request-id',
            type: '',
            example: 'muzk84b1-e2753470',
            description: text('由边缘中间件生成的请求 ID，缺失时服务端另行生成。'),
          },
          {
            name: 'Retry-After',
            type: '',
            example: '38',
            description: [
              { type: 'text', value: '仅在 ' },
              { type: 'code', value: '429' },
              { type: 'text', value: ' 时出现，单位秒。' },
            ],
          },
          {
            name: 'Access-Control-Allow-Origin',
            type: '',
            example: '（未下发）',
            description: text('当前实现没有输出跨域头，浏览器跨源调用会被拦截；同域页面可直接 fetch。'),
          },
          {
            name: 'X-Cache / X-RateLimit-*',
            type: '',
            example: '（未下发）',
            description: text('缓存命中看响应里的 cached 字段，剩余配额的计数头还没实现。'),
          },
        ],
      },
    ],
  },
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
            name: '方法不支持',
            type: '',
            description: text('由框架直接返回，响应体为空'),
            suggestion: text('使用 GET 请求。'),
          },
          {
            http: '422',
            statusCode: '422',
            name: '参数不合法',
            type: '',
            description: [
              { type: 'text', value: 'message 为「type 只能是 beauty 或 pretty」，并带 ' },
              { type: 'code', value: 'issues' },
              { type: 'text', value: ' 指明是 type 字段。' },
            ],
            suggestion: text('两组之一；想省事就一个都不传，走 beauty。'),
          },
          {
            http: '429',
            statusCode: '429',
            name: '频率限制',
            type: '',
            description: [
              { type: 'text', value: 'message 为「请求过于频繁」，description 为「请在 N 秒后重试」，并带 ' },
              { type: 'code', value: 'Retry-After' },
              { type: 'text', value: ' 头。窗口固定 60 秒。' },
            ],
            suggestion: text('清单一次拿全就能长期用，没必要反复请求。'),
          },
          {
            http: '500',
            statusCode: '500',
            name: '资源不可用',
            type: '',
            description: text('message 为「图片资源不可用」，description 会指出是哪个目录空了或不存在'),
            suggestion: text('确认 public/assets/images/<type> 里有图片文件。'),
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
            name: '调用频率',
            type: '120 次 / 分钟 / IP',
            description: [
              { type: 'text', value: '按「IP + 方法 + 路径」固定窗口计数（窗口 60 秒），阈值取自环境变量 ' },
              { type: 'code', value: 'RATE_LIMIT_PER_MIN' },
              { type: 'text', value: '，默认 120；超限返回 ' },
              { type: 'code', value: '429' },
              { type: 'text', value: ' 与 Retry-After 头。两组共用同一份配额。' },
            ],
          },
          {
            name: '目录缓存',
            type: '10 分钟 / 每类型',
            description: text('两组各存一份清单，命中时 cached=true；'),
          },
          {
            name: '缓存实现',
            type: '进程内存',
            description: text('单进程内存表'),
          },
          {
            name: '图库规模',
            type: '每组 16 张 · 约 2.4 MB',
            description: text('一份清单的 JSON 实测 2.7 KB；图片本体按需加载，接口不会替你下载它们。'),
          },
          {
            name: '新资源生效',
            type: '最长 10 分钟',
            description: text('往目录里补图不用重启，但也要等缓存过期才会进清单。'),
          },
          {
            name: '超时与重试',
            type: '建议 3 s / 1 次',
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
            name: '2026-10-08',
            type: 'v1.0',
            description: text('图片接口上线：beauty / pretty 两组清单与访问地址，目录列表服务端缓存 10 分钟。'),
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
    code: `# 不传 type：默认 beauty
curl "${url}"

curl "${url}?type=beauty"
curl "${url}?type=pretty"`,
  },
  {
    value: 'js',
    label: 'JavaScript',
    lang: 'js',
    code: `const res = await fetch("${url}?type=pretty");
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

data = requests.get("${url}", params={"type": "beauty"}).json()["data"]
print(data["type"], data["total"], "cached:", data["cached"])
print(random.choice(data["items"])["url"])`,
  },
];

const responsePanes: CodePaneData[] = [
  {
    value: 'ok',
    label: '200 · beauty',
    lang: 'json',
    code: `{
  "statusCode": 200,
  "message": "success",
  "data": {
    "type": "beauty",
    "total": 16,
    "cached": false,
    "items": [
      {
        "id": "0a012345eafa1f9e",
        "file": "0a012345eafa1f9e.jpg",
        "format": "jpg",
        "size": 171512,
        "url": "http://localhost:3000/assets/images/beauty/0a012345eafa1f9e.jpg"
      },
      {
        "id": "0a45ebdce4239970",
        "file": "0a45ebdce4239970.jpg",
        "format": "jpg",
        "size": 99852,
        "url": "http://localhost:3000/assets/images/beauty/0a45ebdce4239970.jpg"
      }
      // … 共 16 条，按文件名排序
    ]
  },
  "meta": {
    "requestId": "muzk84b1-e2753470",
    "serverTime": "2026-10-08T13:16:07.518Z",
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
  "message": "type 只能是 beauty 或 pretty",
  "description": "type：type 只能是 beauty 或 pretty",
  "issues": [
    { "field": "type", "message": "type 只能是 beauty 或 pretty", "code": "invalid_type" }
  ],
  "data": null,
  "meta": {
    "timestamp": 1791465375020,
    "traceId": "muzk8a3l-ca68ce99"
  }
}`,
  },
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const imagesDoc: ApiDoc = {
  slug: 'images',
  name: '图片',
  en: 'Images',
  category: '图片',
  method: 'GET',
  path,
  implemented: true,
  documented: true,
  eyebrow: 'Image API · v1',
  lede: '缺一张能用人像图的时候，来这两份清单里挑',
  facts: ['beauty / pretty 两组，各 16 张', '目录清单缓存 10 分钟'],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-08' },
    { label: '类型', value: 'beauty · pretty' },
    { label: '资源规模', value: '每组 16 张 jpg · 约 2.4 MB' },
    { label: '限频', value: '120 次 / 分钟 / IP' },
  ],
  sections,
  requestPanes,
  responsePanes,
};

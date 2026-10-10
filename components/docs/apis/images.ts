/** 接口文档内容；字段行为与数字均为 2026-10-08 实测 */
import { frag, para, text } from '../fragments';
import { apiUrl } from '../url';
import { RATE_LIMIT_ROW, headersSection, requestSection } from '../commonSections';
import type { AuthoredApiDoc, CodePaneData, DocSection } from '../types';

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
  requestSection({ path }),
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
          { name: 'thumbUrl', type: 'string', description: text('448px 宽的 webp 派生图，8.2–51.1 KB，约为原图的 1/6'), isChild: true },
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
  headersSection({
    cache: text('接口响应不缓存；图片走站内静态资源'),
    traceId: 'muzk84b1-e2753470',
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
              { type: 'text', value: 'message 为「type 只能是 beauty 或 pretty」，并带 ' },
              { type: 'code', value: 'issues' },
              { type: 'text', value: ' 指明是 type 字段。' },
            ],
            suggestion: text('两组之一；想省事就一个都不传，走 beauty。'),
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
            suggestion: text('清单一次拿全就能长期用，没必要反复请求。'),
          },
          {
            http: '500',
            statusCode: '500',
            label: '资源不可用',
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
          RATE_LIMIT_ROW,
          {
            item: '目录缓存',
            limit: '10 分钟 / 每类型',
            description: text('两组各存一份清单，命中时 cached=true；'),
          },
          {
            item: '缓存实现',
            limit: '进程内存',
            description: text('单进程内存表'),
          },
          {
            item: '图库规模',
            limit: '每组 16 张 · 约 2.4 MB',
            description: text('一份清单的 JSON 实测 2.7 KB；图片本体按需加载，接口不会替你下载它们。'),
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
export const imagesDoc: AuthoredApiDoc = {
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

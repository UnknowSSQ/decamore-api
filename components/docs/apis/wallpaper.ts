/** 接口文档内容；字段行为与数字均为 2026-10-08 实测 */
import { frag, para, text } from '../fragments';
import { apiUrl } from '../url';
import { headersSection } from '../commonSections';
import type { ApiDoc, CodePaneData, DocSection } from '../types';

const path = '/api/v1/wallpaper';
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(
        ...text(
          '换张壁纸是小事，挑图是大事：横的竖的、要不要跟着今天一起换。这个接口把挑图那一步替你省了——给一张，你拿到的是直链和它真实的尺寸，图片本体不在响应里，存哪儿、怎么用都随你。',
        ),
      ),
      para(
        ...frag`对外接口返回单层信封 ${'{ statusCode, message, data, meta }'}：${'data'} 就是这张壁纸，${'meta'} 收敛调用元信息（${'requestId'} / ${'serverTime'} / ${'site'}）。其中 ${'requestId'} 与响应头 ${'x-trace-id'} 同值，反馈问题时提供它即可定位到服务端日志。`,
      ),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '列表里用 thumb 就好。',
        fragments: text(
          '缩略图实测 1.5–36 KB，原图 60–330 KB。前者放卡片和列表，后者留给真想看清的人点开那一下——省下来的流量，够用户多刷几屏。',
        ),
      },
    ],
  },
  {
    id: 'request',
    title: '请求方式',
    content: [
      para(
        ...frag`一行 ${'GET'} 就够了，最多带一个可选的 ${'type'}。不用登录，不用请求体，响应是 UTF-8 编码的 ${'application/json; charset=utf-8'}。`,
      ),
      {
        kind: 'table',
        variant: 'request',
        rows: [
          { item: '请求方法', value: 'GET', description: [
            { type: 'text', value: '其他方法由框架直接返回 ' },
            { type: 'code', value: '405' },
            { type: 'text', value: '（无响应体，不经过业务信封）' },
          ]},
          { item: '站内路径', value: '/api/v1/wallpaper', description: text('同源页面可直接相对路径调用') },
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
      para(...text('只有一个可选参数：想要横的、竖的，还是今天必应换上的那一张。')),
      {
        kind: 'table',
        variant: 'params',
        rows: [
          {
            name: 'type',
            type: 'pc / mobile / bing',
            required: 'no',
            defaultValue: '随机',
            description: [
              { type: 'text', value: '不传时先等概率挑一类，再在这类里随一张；' },
              { type: 'code', value: '?type=' },
              { type: 'text', value: ' 留空和不传是一回事。' },
            ],
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'warn',
        mark: '!',
        strong: '猜不到的取值，我们不替你兜底。',
        fragments: text(
          '?type=ipad 会老老实实返回 422 并说明哪儿不对——与其悄悄当成随机、让你以为参数生效了，不如当场讲清楚。只有什么都不传，才交给随机。',
        ),
      },
    ],
  },
  {
    id: 'response',
    title: '返回参数',
    content: [
      para(...text('响应体是一个 UTF-8 的 JSON 对象，单层信封。字段摊开来看：')),
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
          { name: 'data', type: 'object', description: text('这一次给到的那张壁纸。') },
          {
            name: 'type',
            type: 'string',
            description: text('实际命中的类型；请求没传 type 时以这里为准——随机就是真随机，别拿它找规律。'),
            isChild: true,
          },
          {
            name: 'url',
            type: 'string',
            description: [
              { type: 'text', value: '原图直链（绝对地址）。域名跟着部署配置的 ' },
              { type: 'code', value: 'NEXT_PUBLIC_SITE_URL' },
              { type: 'text', value: ' 走，没配就是 localhost:3000，所以别把它当主键存库——要存就存 id。' },
            ],
            isChild: true,
          },
          {
            name: 'thumb',
            type: 'string',
            description: text('缩略图直链：pc / mobile 是同名 .webp，bing 是 640×480 的 .jpg。卡片和列表用它就够了，不会拖慢首屏。'),
            isChild: true,
          },
          {
            name: 'id',
            type: 'string',
            description: text('这张图的身份证号：站内文件是文件名去掉后缀，必应是它自己的图片 id。本地缓存、去重、记日志都适合用它。'),
            isChild: true,
          },
          {
            name: 'width',
            type: 'integer | null',
            description: text('原图宽度（像素），服务端读图像头读出来的；读不出就老实给 null，不猜。'),
            isChild: true,
          },
          {
            name: 'height',
            type: 'integer | null',
            description: [
              { type: 'text', value: '原图高度（像素）。pc 类实测 2560×1440–5120×2880，mobile 类是 884×1920 到 1600×3489 的竖版' },
            ],
            isChild: true,
          },
          {
            name: 'title',
            type: 'string | null',
            description: text('只有必应那张有——必应自己写的标题。站内两类固定 null。'),
            isChild: true,
          },
          {
            name: 'copyright',
            type: 'string | null',
            description: text('同样只有必应有：画面说明加摄影者与图库，形如「…… (© 摄影者/图库)」。要展示图，也请把它一起留着。'),
            isChild: true,
          },
          {
            name: 'date',
            type: 'string | null',
            description: text('必应这张图的生效日期（YYYY-MM-DD）；本地两类为 null。'),
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
            description: [
              { type: 'text', value: '服务端生成响应的 ISO 8601 时间（UTC）' },
            ],
            isChild: true,
          },
          {
            name: 'site',
            type: 'string',
            description: text('站点名称'),
            isChild: true,
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '三类共用一张字段表。',
        fragments: text(
          '本地两类没有的 title / copyright / date 固定返回 null，而不是整个键悄悄消失——你按同一套结构解析就好，不必为哪一种类型单独写分支。',
        ),
      },
    ],
  },
  headersSection({
    cache: text('接口响应不缓存；图片走站内静态资源，带 ETag 与 Last-Modified，不受这条头约束。'),
    traceId: 'muye4dao-bcfd7105',
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
              { type: 'text', value: 'message 为「type 只能是 pc、mobile 或 bing」，并带 ' },
              { type: 'code', value: 'issues' },
              { type: 'text', value: ' 指明是哪个字段。' },
            ],
            suggestion: text('把取值收敛到三类；实在懒得选，就一个都不传，交给随机。'),
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
            suggestion: text('按 Retry-After 退避，并缓存已经拿过的直链。'),
          },
          {
            http: '503',
            statusCode: '503',
            label: '必应上游取不到',
            description: text('message 为「必应壁纸暂时取不到」。只有请求 bing（或随机恰好选中 bing）时才可能出现——站内两类不依赖外网。'),
            suggestion: text('换 pc / mobile 重试，或者稍后再来；站内已经存了当天那张时，就不会再去打扰必应。'),
          },
          {
            http: '500',
            statusCode: '500',
            label: '服务端内部错误',
            description: text('壁纸目录为空，或目录里的图片没有配齐同名 .webp 缩略图。'),
            suggestion: [
              { type: 'text', value: '重试 1 次；仍失败请携带 ' },
              { type: 'code', value: 'traceId' },
              { type: 'text', value: ' 反馈。' },
            ],
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '没有 404。',
        fragments: text('随机接口不存在「查无此图」；按 id 取指定壁纸的能力目前没有提供，id 只用来做本地缓存键。'),
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
              { type: 'text', value: ' 与 Retry-After 头。' },
            ],
          },
          {
            item: '并发建议',
            limit: '≤ 2 QPS',
            description: text('批量拉图请串行或合并请求，跟默认阈值留点余地——接口不怕你用，怕你一次性把所有图都翻一遍。'),
          },
          {
            item: '服务端缓存',
            limit: '目录一次 / 必应 1 小时',
            description: text('本地两类在首次请求时扫一次目录，尺寸一并读好放在进程里；必应当天的结果缓存 1 小时。接口响应本身不缓存，你拿到的每次都是新的一张。'),
          },
          {
            item: '外部依赖',
            limit: '必应 HPImageArchive',
            description: text('bing 类会去问必应要当天索引，并把原图与 640×480 缩略图存一份到站内 wallpaper/bing；存成功就由站内直接供图，存不上就退回必应的直链，连当天索引都拿不到时给 503。'),
          },
          {
            item: '客户端建议',
            limit: '预览用 thumb',
            description: text('缩略图和直链都能按 id 存在本地。同一类重复请求只会换一张图，不需要为同一屏内容反复问。'),
          },
          {
            item: '超时与重试',
            limit: '建议 3 s / 1 次',
            description: [
              { type: 'text', value: '仅对 ' },
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
            description: text('壁纸接口上线：pc / mobile 读站内静态目录，bing 接必应当日壁纸并把当日图镜像进站内。'),
          },
        ],
      },
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '随机池以目录文件为准。',
        fragments: text(
          '往 wallpaper/desktop 或 wallpaper/mobile 里加图即可扩大池子，但必须同时在 wallpaper-thumb 放同名 .webp——没有缩略图的图不会进池子。',
        ),
      },
    ],
  },
];


const requestPanes: CodePaneData[] = [
  {
    value: 'curl',
    label: 'cURL',
    lang: 'bash',
    code: `# 不传 type：三类里随机
curl "${url}"

# 指定类型
curl "${url}?type=pc"
curl "${url}?type=mobile"
curl "${url}?type=bing"`,
  },
  {
    value: 'js',
    label: 'JavaScript',
    lang: 'js',
    code: `const res = await fetch("${url}?type=pc");
const { statusCode, message, data, meta } = await res.json();

if (statusCode === 200) {
  console.log(data.url, data.width + "x" + data.height, data.id);
  console.log("预览:", data.thumb, "requestId:", meta.requestId);
} else {
  console.error(message);
}`,
  },
  {
    value: 'py',
    label: 'Python',
    lang: 'py',
    code: `import requests

body = requests.get("${url}", params={"type": "pc"}).json()
data, meta = body["data"], body["meta"]
print(data["url"], f'{data["width"]}x{data["height"]}', meta["requestId"])`,
  },
];

const responsePanes: CodePaneData[] = [
  {
    value: 'ok',
    label: '200 · pc',
    lang: 'json',
    code: `{
  "statusCode": 200,
  "message": "success",
  "data": {
    "type": "pc",
    "url": "http://localhost:3000/assets/wallpaper/desktop/9a71d1df0dd67170.jpg",
    "thumb": "http://localhost:3000/assets/wallpaper-thumb/desktop/9a71d1df0dd67170.webp",
    "id": "9a71d1df0dd67170",
    "width": 5120,
    "height": 2880,
    "title": null,
    "copyright": null,
    "date": null
  },
  "meta": {
    "requestId": "muye4dao-bcfd7105",
    "serverTime": "2026-10-08T01:37:28.154Z",
    "site": "Decamore API"
  }
}`,
  },
  {
    value: 'bing',
    label: '200 · bing',
    lang: 'json',
    code: `{
  "statusCode": 200,
  "message": "success",
  "data": {
    "type": "bing",
    "url": "http://localhost:3000/assets/wallpaper/bing/OHR.MayotteOctopus_ZH-CN2837659998_1920x1080.jpg",
    "thumb": "http://localhost:3000/assets/wallpaper/bing/OHR.MayotteOctopus_ZH-CN2837659998_640x480.jpg",
    "id": "OHR.MayotteOctopus_ZH-CN2837659998",
    "width": 1920,
    "height": 1080,
    "title": "现在你“海”能看见我……",
    "copyright": "印度洋马约特岛，一只呈防御姿态的章鱼 (© Gabriel Barathieu/Minden Pictures)",
    "date": "2026-10-07"
  },
  "meta": {
    "requestId": "muye4d3b-465f929f",
    "serverTime": "2026-10-08T01:37:28.400Z",
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
  "message": "type 只能是 pc、mobile 或 bing",
  "description": "type：type 只能是 pc、mobile 或 bing",
  "issues": [
    { "field": "type", "message": "type 只能是 pc、mobile 或 bing", "code": "invalid_type" }
  ],
  "data": null,
  "meta": {
    "timestamp": 1791394648400,
    "traceId": "muye4d3b-465f929f"
  }
}`,
  },
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const wallpaperDoc: ApiDoc = {
  slug: 'wallpaper',
  name: '随机壁纸',
  en: 'Wallpaper',
  category: '图片',
  method: 'GET',
  path,
  implemented: true,
  documented: true,
  eyebrow: 'Image API · v1',
  lede: '不用挑图：说一类（或直接不说），还你一张壁纸的直链、缩略图和它真实的尺寸。',
  facts: ['pc / mobile / bing 三类，不传就随机', '限频 120 次 / 分钟 / IP'],
  metaRows: [
    { label: '当前版本', value: 'v1.0' },
    { label: '首版发布', value: '2026-10-08' },
    { label: '资源规模', value: 'pc 16 张 · mobile 16 张 · bing 当日 1 张' },
    { label: '鉴权', value: '无需' },
    { label: '限频', value: '120 次 / 分钟 / IP' },
  ],
  sections,
  requestPanes,
  responsePanes,
};

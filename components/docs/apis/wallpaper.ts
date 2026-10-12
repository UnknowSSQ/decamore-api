/** 接口文档内容；字段行为与数字均为 2026-10-11 实测（四类各取样，含上游体积、直链生效条件与随机分布） */
import { API } from '@/lib/api/endpoints';
import { WALLPAPER_TYPE_HINT } from '@/lib/zod/public.schema';
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

const path = API.publicApi.wallpaper;
const url = apiUrl(path);

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '接口说明',
    content: [
      para(
        ...text(
          '换张壁纸',
        ),
      ),
      envelopeOverview('就是这张壁纸'),
      {
        kind: 'callout',
        tone: 'info',
        mark: 'i',
        strong: '列表里用 thumb 就好。',
        fragments: text(
          '站内两类的缩略图实测 1–36 KB、原图 59–326 KB；bing 是 32 KB 与 330 KB 一对；nasa 是 64 KB 与 281 KB 一对。列表里铺 thumb，原图留给真想看清的人。',
        ),
      },
    ],
  },
  requestSection({ path }),
  paramsSection(
    [
      {
        name: 'type',
        type: 'pc / mobile / bing / nasa',
        required: 'no',
        defaultValue: '随机',
        description: [
          { type: 'text', value: '不传时先等概率挑一类，再在这类里随一张；' },
          { type: 'code', value: '?type=' },
          { type: 'text', value: ' 留空和不传是一回事。nasa 是 NASA 的每日天文图（APOD）当天那一张，带真标题与摄影者。' },
        ],
      },
    ],
    {
      kind: 'callout',
      tone: 'warn',
      mark: '!',
      strong: '猜不到的取值，我们不替你兜底。',
      fragments: text(
        '?type=ipad 会老老实实返回 422 并说明哪儿不对。与其悄悄当成随机、让你以为参数生效了，不如当场讲清楚。只有什么都不传，才交给随机。',
      ),
    },
  ),
  responseSection(
    '这一次给到的那张壁纸。',
    [
      {
        name: 'type',
        type: 'string',
        description: text('实际命中的类型；请求没传 type 时以这里为准：随机就是真随机，别拿它找规律。'),
        isChild: true,
      },
      {
        name: 'url',
        type: 'string',
        description: [
          { type: 'text', value: '原图直链（绝对地址）。域名跟着部署配置的 ' },
          { type: 'code', value: 'NEXT_PUBLIC_SITE_URL' },
          { type: 'text', value: ' 走，没配就是 localhost:3000，所以别把它当主键存库，要存就存 id。' },
        ],
        isChild: true,
      },
      {
        name: 'thumb',
        type: 'string',
        description: text('缩略图直链：pc / mobile 是同名 .webp，bing 与 nasa 都是 640×480 的 .jpg。'),
        isChild: true,
      },
      {
        name: 'id',
        type: 'string',
        description: text('这张图的身份证号：站内文件是文件名去掉后缀，必应是它自己的图片 id，nasa 就是那天的日期（2026-10-11）。本地缓存、去重、记日志都适合用它。'),
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
        description: text('原图高度（像素）。pc 类实测 2560×1440–5120×2880，mobile 类是 884×1920 到 1600×3489 的竖版'),
        isChild: true,
      },
      {
        name: 'title',
        type: 'string | null',
        description: text('必应是必应写的标题（「秋色中转动的水轮」），nasa 是 APOD 的原标题（「Ice Fishing for Cosmic Neutrinos」，多为英文）。站内两类固定 null。'),
        isChild: true,
      },
      {
        name: 'copyright',
        type: 'string | null',
        description: text('必应是画面说明加摄影者与图库，形如「…… (© 摄影者/图库)」；nasa 是 APOD 的署名，上游给的是带链接的 HTML，这里已剥成纯文本（「NSF, B. Gudbjartsson, IceCube Collaboration」）。要展示图就把这句一起留着。'),
        isChild: true,
      },
      {
        name: 'date',
        type: 'string | null',
        description: text('这张图在源站生效的日期（YYYY-MM-DD）；本地两类为 null。必应取的是 enddate——实测当日在架那张的 startdate 是昨天，按它取会晚一天。'),
        isChild: true,
      },
    ],
    {
      kind: 'callout',
      tone: 'info',
      mark: 'i',
      strong: '四类共用一张字段表。',
      fragments: text(
        '某一类没有的字段固定返回 null，而不是整个键悄悄消失。你按同一套结构解析就好，不必为哪一种类型单独写分支。',
      ),
    },
  ),
  headersSection({
    cache: text('接口响应不缓存；图片走站内静态资源，带 ETag 与 Last-Modified，不受这条头约束。'),
    traceId: 'muye4dao-bcfd7105',
  }),
  errorsSection(
    [
      METHOD_NOT_SUPPORTED_ROW,
      validationRow({
        label: '参数不合法',
        message: WALLPAPER_TYPE_HINT,
        suggestion: text('把取值收敛到四类；实在懒得选，就一个都不传，交给随机。'),
      }),
      rateLimitedRow(text('按 Retry-After 退避，并缓存已经拿过的直链。')),
      {
        http: '503',
        statusCode: '503',
        label: '上游取不到',
        description: text('message 是「必应壁纸暂时取不到」或「NASA 每日图暂时取不到」。只有请求对应那一类（或随机恰好选中它）时才可能出现，站内两类不依赖外网。'),
        suggestion: text('换 pc / mobile 重试，或者稍后再来；站内已经存了当天那张时，就不会再去打扰上游。'),
      },
      {
        http: '500',
        statusCode: '500',
        label: '服务端内部错误',
        description: text('壁纸目录为空，或目录里的图片没有配齐同名 .webp 缩略图。'),
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
        fragments: text('随机接口不存在「查无此图」；按 id 取指定壁纸的能力目前没有提供，id 只用来做本地缓存键。'),
      },
    },
  ),
  limitsSection([
    RATE_LIMIT_ROW,
    {
      item: '并发建议',
      limit: '≤ 2 QPS',
      description: text('批量拉图请串行或合并请求，跟默认阈值留点余地。接口不怕你用，怕你一次性把所有图都翻一遍。'),
    },
    {
      item: '服务端缓存',
      limit: '目录一次 / 上游各 1 小时',
      description: text('本地两类在首次请求时扫一次目录，尺寸一并读好放在进程里；必应与 APOD 当天的结果各缓存 1 小时。接口响应本身不缓存，站内两类你拿到的每次都是新的一张。'),
    },
    {
      item: '外部依赖',
      limit: '必应 HPImageArchive + NASA APOD',
      description: text('两类都会把当天的图存一份到站内（wallpaper/bing、wallpaper/nasa），只保留最近 7 天；连当天索引都拿不到时给 503。APOD 走 science.nasa.gov 的 WordPress 接口（免 key），图片在 assets.science.nasa.gov。'),
    },
    {
      item: '站内直链什么时候生效',
      limit: '本次启动前已落盘才算',
      description: text('next start 在启动时就把 public/ 登记进了静态路由表，进程运行期间新写进去的文件要等下次启动才 serve（实测同目录下「启动后写入」404、「启动前已在」200）。所以当天第一次拿到的 url / thumb 是上游直链，文件照样落盘，重启之后同一张就换成站内直链。要哪一头都可用——按 url 直接下载即可。'),
    },
    {
      item: '客户端建议',
      limit: '预览用 thumb',
      description: text('缩略图和直链都能按 id 存在本地。同一类重复请求只会换一张图，不需要为同一屏内容反复问。'),
    },
    TIMEOUT_LIMIT_ROW,
  ]),
  changelogSection(
    [
      {
        date: '2026-10-11',
        version: 'v1.2',
        description: text('nasa 换成 APOD 每日一图（science.nasa.gov 的 WordPress 接口，免 key）：有真标题与摄影者，原图与 640×480 缩略图各存一份。同时修一处死链——进程运行期间新写进 public/ 的文件下次启动前取不到，所以当天先给上游直链。'),
      },
      {
        date: '2026-10-11',
        version: 'v1.1',
        description: text('加 nasa 一类（首版接的是 NASA EPIC 地球日像），并修掉 bing 的 date 口径——原先取 startdate，当日在架那张会报成昨天。'),
      },
      {
        date: '2026-10-08',
        version: 'v1.0',
        description: text('壁纸接口上线：pc / mobile 读站内静态目录，bing 接必应当日壁纸并把当日图镜像进站内。'),
      },
    ],
    {
      kind: 'callout',
      tone: 'info',
      mark: 'i',
      strong: '随机池以目录文件为准。',
      fragments: text(
        '往 wallpaper/desktop 或 wallpaper/mobile 里加图即可扩大池子，但必须同时在 wallpaper-thumb 放同名 .webp，没有缩略图的图不会进池子。',
      ),
    },
  ),
];


const requestPanes: CodePaneData[] = [
  {
    value: 'curl',
    label: 'cURL',
    lang: 'bash',
    code: `# 不传 type：四类里随机
curl "${url}"

# 指定类型
curl "${url}?type=pc"
curl "${url}?type=mobile"
curl "${url}?type=bing"
curl "${url}?type=nasa"`,
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
  successPane({
    label: '200 · pc',
    requestId: 'muye4dao-bcfd7105',
    serverTime: '2026-10-08T01:37:28.154Z',
    dataJson: `{
    "type": "pc",
    "url": "http://localhost:3000/assets/wallpaper/desktop/9a71d1df0dd67170.jpg",
    "thumb": "http://localhost:3000/assets/wallpaper-thumb/desktop/9a71d1df0dd67170.webp",
    "id": "9a71d1df0dd67170",
    "width": 5120,
    "height": 2880,
    "title": null,
    "copyright": null,
    "date": null
  }`,
  }),
  successPane({
    value: 'bing',
    label: '200 · bing',
    requestId: 'mv3ivwkn-560f66ffeeeb',
    serverTime: '2026-10-11T07:49:42.953Z',
    dataJson: `{
    "type": "bing",
    "url": "http://localhost:3000/assets/wallpaper/bing/OHR.BabcockSP_ZH-CN5266848536_1920x1080.jpg",
    "thumb": "http://localhost:3000/assets/wallpaper/bing/OHR.BabcockSP_ZH-CN5266848536_640x480.jpg",
    "id": "OHR.BabcockSP_ZH-CN5266848536",
    "width": 1920,
    "height": 1080,
    "title": "秋色中转动的水轮",
    "copyright": "格莱德溪磨坊，巴布科克州立公园，西弗吉尼亚州，美国 (© dszc/Getty Images)",
    "date": "2026-10-11"
  }`,
  }),
  successPane({
    value: 'nasa',
    label: '200 · nasa',
    requestId: 'mv3oen7y-2a5de995f81f',
    serverTime: '2026-10-11T10:24:15.119Z',
    dataJson: `{
    "type": "nasa",
    "url": "http://localhost:3000/assets/wallpaper/nasa/2026-10-11.jpg",
    "thumb": "http://localhost:3000/assets/wallpaper/nasa/2026-10-11_640x480.jpg",
    "id": "2026-10-11",
    "width": 1440,
    "height": 1080,
    "title": "Ice Fishing for Cosmic Neutrinos",
    "copyright": "NSF, B. Gudbjartsson, IceCube Collaboration",
    "date": "2026-10-11"
  }`,
  }),
  failurePane({
    statusCode: 422,
    message: WALLPAPER_TYPE_HINT,
    requestId: 'mv3ivwsk-ece1573dabf7',
    serverTime: '2026-10-11T07:49:42.981Z',
    description: `type：${WALLPAPER_TYPE_HINT}`,
    issues: [
      { field: 'type', message: WALLPAPER_TYPE_HINT, code: 'invalid_type' },
    ],
  }),
];

/** 名称/路径/分类等身份字段由 registry 按车单覆盖 */
export const wallpaperDoc: AuthoredApiDoc = {
  eyebrow: 'Image API · v1',
  lede: '不用挑图：说一类（或直接不说），还你一张壁纸的直链、缩略图和它真实的尺寸。',
  facts: ['pc / mobile / bing / nasa 四类，不传就随机', `限频 ${rateLimitText}`],
  metaRows: [
    { label: '当前版本', value: 'v1.2' },
    { label: '首版发布', value: '2026-10-08' },
    { label: '资源规模', value: 'pc 16 张 · mobile 16 张 · bing 当日 1 张 · nasa 当日 1 张' },
    { label: '鉴权', value: '无需' },
    { label: '限频', value: rateLimitText },
  ],
  sections,
  requestPanes,
  responsePanes,
};

# 新增接口模板（以一言 /api/v1/hitokoto 为范例）

> 用途：新增**对外公开接口**时按本文件的层次落地，避免只写路由、漏掉类型 / 客户端 / 目录 / 文档导致接口"能跑但不能用"。
> 参考实现：无参数接口看 `hitokoto`（`app/api/v1/hitokoto/route.ts` + `lib/server/hitokoto.ts` + `components/docs/apis/hitokoto.ts`）；
> 带 query 参数、且要读外部数据源的看 `wallpaper`（`app/api/v1/wallpaper/route.ts` + `lib/server/wallpaper.ts` + `components/docs/apis/wallpaper.ts`）。
> 一句话原则：**数据形状定义一次（types），读取一次（lib/server），信封一次（publicOk），调用方一次（envelope: 'public'）**。

## 1. 一个接口会碰到的层

| # | 文件 | 做什么 | 一言里的对应 | 可跳过条件 |
|---|---|---|---|---|
| 1 | `types/domain.ts` | 定义业务数据类型（前后端共用，别放 `lib/server` 里给客户端 import） | `HitokotoLine` | 不可省 |
| 2 | `lib/server/<name>.ts` | 数据源：`import 'server-only'` + 进程内缓存 + 并发 single-flight | `loadCorpus()` / `randomHitokoto()` | 纯静态常量可直接放 `constants/` |
| 3 | `lib/zod/*.schema.ts` | **仅在有参数时**定义 query/body schema | 无参数 → 不定义 | 无参数时整层省略 |
| 4 | `app/api/v1/<name>/route.ts` | `defineRoute({ auth:false, route })` + `publicOk(data)` | 见参考实现 | 不可省 |
| 5 | `lib/api/endpoints.ts` | 路径常量登记到 `publicApi` | `hitokoto: ${V1}/hitokoto` | 不可省 |
| 6 | `lib/api/admin-api.ts` | 客户端封装，带 `envelope:'public'` | `fetchHitokoto()` | 不可省 |
| 7 | `constants/api-catalog.ts` | 广场目录条目（id/name/en/path/cat/method/desc/kw/hint/demo） | `id: 'hitokoto'` | 接口不对外展示可跳 |
| 8 | `components/plaza/demos/*` | 交互演示：新建 `XxxDemo.tsx` → 在 `index.ts` 的 `DEMO_REGISTRY` 注册 → `types/domain.ts` 的 `DemoKind` 补字面量 | `QuoteDemo` | 无演示则不注册（会落到 `DemoFallback`） |
| 9 | `constants/card-layout.ts` | 若上首页 Live 区：默认跨度 + 卡片 id | `DEFAULT_LIVE_CARD_LAYOUT` | 不上首页可跳 |
| 10 | `components/docs/apis/<slug>.ts` + `registry.ts` | 写一页文档并登记；页面由 `app/docs/[slug]/page.tsx` 自动生成 | `hitokotoDoc` + `API_DOCS` | 不登记也有页，但只是「待补充」骨架页（且 noindex） |

## 2. 文档文案风格（所有接口文档统一按这一套写）

范例：口吻照 `components/docs/apis/answerbook.ts`、`components/docs/apis/hitokoto.ts`；**详略照 `components/docs/apis/hotsearch.ts`**（十篇文档里它最短，2026-10-08 用户要求其余各篇向它看齐）。

**总原则：文风要暖，像同事坐在旁边给你讲，而不是机器在打印规格表。** 准确性不让步，但每一格文字都尽量落在「一句人话 + 必要数字」的节奏上。

- **详略以 hotsearch 为准**：`main` 里的正文去掉空白后控制在 **2.2k–2.6k 字符**。超了就先砍引导性段落，而不是砍字段行。

- 分节固定 8 个：`overview` / `request` / `params` / `response` / `headers` / `errors` / `limits` / `changelog`，外加 `requestPanes`、`responsePanes` 两个代码窗。没有的内容也要留节并写清"没有"。
- `overview` 第一段从**使用场景**起笔（"想知道此刻大家都在聊什么，得把四个 App 挨个打开看"），讲这个接口替你省掉哪一步；第二段才讲信封。不要一上来复述字段名。
- **`request` / `params` / `response` 三节不写引导段**（"一行 GET 就够了…""只有一个可选参数…""响应体是一个 UTF-8 的 JSON 对象，字段摊开来看："）——直接上表格。`overview` 已经交代过的事不在节首复读。
- 字段行的 `description` 控制在**十几个字**，一句话说清这是什么、拿它怎么办（"排名"、"命中 60 秒缓存时为 true"、"累计票房原文，是给人看的字符串不是数值"）。别在表格里塞上游端点、换算过程、踩坑史——那些留给 `limits` 和 callout。
- `changelog` 只放表格，不要尾巴 callout；`limits` 里"缓存实现"写"单进程内存表"就够，Redis 那句待办在本文第 6 节记着，不必每篇复述。
- 表格里的 `description` 也要带语气，别写成字段名复读：说清**为什么是这样、拿它怎么办**（例：`url` 写"别把它当主键存库——要存就存 id"；`score` 写"缺省时是 null 而不是 0"）。
- 用第二人称、短句、日常动词；允许一句轻的幽默（"毕竟很少有人真的往下翻到第 200 名"）。不要堆形容词，不要抒情，不要"赋能/一站式/轻松搞定"这类话。
- 每节最多一个加粗 callout，挑**最容易被误解的那一点**（例：「答案与问题无关。」「热度数字不能跨平台比。」），再用一两句解释，不要堆三条以上。
- 上游不给的东西就直说不给，并说明为什么不去凑（「没有 url 字段。」「我们不去别处拼一个看着像评分的东西给你。」）。
- 写进文档的每个数字、每条字段行为都必须 `curl` 实测过；没测过的（SLA、平均响应时间、可用性百分比）一律不写。
- 语料/内容类的风格事实，**给真实取值举例**比给统计数字好读：写 `Ask heaven and earth, ask yourself` 这种真实串，而不是"约 128 条标题式"。
- 代码窗的示例响应直接粘真实 `curl` 输出（含真实的 `requestId` / `serverTime` 形态），不要凭想象编一个看起来合理的。
- 不要把特性排比塞进正文（"免鉴权、无参数、单层信封、限频 120"）——表格已经表达了，正文重复就是机械味。
- `facts` / `metaRows` 保持克制：`facts` 1–2 条，`metaRows` 只放能证实的行。
- 未实现、未撰写、依赖外网这类现状要如实标注，不给出会误导人的"假示例"；失败响应示例统一用 `meta:{ timestamp, traceId }`。

## 3. 响应信封约定（务必区分两类）

```jsonc
// 公开接口成功：单层 PublicApiEnvelope（lib/server/response.ts → publicOk）
{
  "statusCode": 200,
  "message": "success",
  "data": { /* 业务数据 */ },
  "meta": { "requestId": "…", "serverTime": "ISO8601", "site": "Decamore API" }
}

// 任何失败（含公开接口）：控制台错误信封，由 defineRoute 自动生成
{ "statusCode": 429, "success": false, "message": "请求过于频繁", "description": "请在 38 秒后重试", "data": null, "meta": { "timestamp": 1791389339453, "traceId": "…" } }
```

- `meta.requestId` 复用请求上下文里的 traceId，**与响应头 `x-trace-id` 同值**；日志里用它检索。
- `meta.site` 取 `APP_NAME` 常量；`meta.serverTime` 是服务端 ISO 时间。业务数据只放 `data`，不要再往信封顶层加字段。
- `statusCode` 就是 HTTP 码，不存在五位业务码。
- 控制台内部接口仍用 `ok()` / `ApiSuccess`（`statusCode/success/message/data`）。
- 客户端必须显式声明信封，否则公开接口的成功响应会因缺 `success` 字段被判为失败：

```ts
http.get<HitokotoLine>(API.publicApi.hitokoto, {
  envelope: 'public',        // 关键
  anonymous: true,           // 公开接口不注入鉴权头
  skipAuthRefresh: true,     // 不参与 401 续期
});
```

## 4. 路由骨架（直接复制改名）

```ts
/**
 * GET /api/v1/<name> — <中文名>（公开）
 * 无鉴权、无参数。数据来自 <数据源>，返回单层 PublicApiEnvelope。
 */
import { defineRoute, publicOk } from '@/lib/server';
import { randomHitokoto } from '@/lib/server/hitokoto'; // ← 换成你的数据源

export const GET = defineRoute(
  {
    auth: false,
    route: '/api/v1/<name>',
    // 有参数时补： query: xxxQuerySchema,   body 仅写接口用
  },
  async () => publicOk(await randomHitokoto()),
);
```

数据源骨架（大文件语料 / 需要缓存时）：

```ts
import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { HitokotoLine } from '@/types';

const FILE = path.join(process.cwd(), 'public/assets/json/hitokoto.json');
let cache: HitokotoLine[] | null = null;
let pending: Promise<HitokotoLine[]> | null = null;   // 并发首请求共享一次读盘

export function loadCorpus(): Promise<HitokotoLine[]> {
  if (cache) return Promise.resolve(cache);
  pending ??= readFile(FILE, 'utf8')
    .then((raw) => JSON.parse(raw) as HitokotoLine[])
    .then((rows) => { if (!rows.length) throw new Error('语料为空'); cache = rows; return rows; })
    .finally(() => { pending = null; });               // 失败后允许下次重试
  return pending;
}
```

> ⚠️ **可变数据源必须挂 globalThis，不能用模块级变量。**
> Next 会把每个 page 与每个 route handler 编成独立的服务端 chunk，模块级 `const` 在每个
> chunk 里各有一份实例：实测 `PATCH /api/v1/apis/[id]` 写入后，`/plaza`、`/docs` 读到的还是旧值。
> 写法见 `lib/server/catalog.ts` 与 `lib/server/mock/settings.ts`：
> `const records = (globalThis as ...).__decamoreCatalog ??= seed();`

## 5. 提交前验证清单

- `npx tsc --noEmit`、`npx next lint` 无新增错误。
- `curl -i http://localhost:3000/api/v1/<name>`：确认**只有一层信封**、`statusCode:200`、`requestId` 等于响应头 `x-trace-id`。
- `curl -i -X POST …/<name>`：应为 `405` 且**无响应体**（框架直接返回，不进业务信封）。
- 有参数时：非法值必须 `422` 且带 `issues`；多余参数被忽略还是拒绝，取决于 schema 有没有 `.strict()`——**默认加 `.strict()`**。
- 限流：继承 `RATE_LIMIT_PER_MIN`（默认 120 次/分钟/IP，60 秒固定窗口，超限带 `Retry-After`），新接口无需单独配置。
- 前端真实调用：打开页面看 Network 有该请求且非缓存（别用本地常量冒充"实时演示"）。
- 文档页 `/docs/<slug>`：参数表、返回字段、代码窗三处必须与 `curl` 实测一致；`generateStaticParams` 由接口目录生成，未知 slug 走 404（`dynamicParams = false`）。
- 接口链接一律 `${siteUrl()}/api/v1/<name>`（文档层由 `components/docs/url.ts` 的 `apiUrl()` 统一拼装），**不要在文案里写死域名**。

## 6. 本次未涉及、待后续补充

| 事项 | 现状 | 待办 |
|---|---|---|
| 失败响应用公开信封 | 失败走 `ApiFailure`，与成功的 `PublicApiEnvelope` 结构不一致 | 在 `defineRoute` 的错误出口按路由类型映射，或对外文档明确"两套结构" |
| CORS | 响应里**没有** `Access-Control-Allow-Origin` | 控制台「安全配置」的 `corsOrigins` 目前是 mock，需要接到响应头下发 |
| 服务端缓存 / `X-Cache` | 未实现，`Cache-Control: no-store` | 若要缓存需补缓存层与命中头；热搜榜等上游榜单（60 s / 10 min / 1 h）与静态资源清单（10 min）都是单进程内存表（`lib/server/hotsearch.ts`、`lib/server/static-assets.ts`），多实例部署要换 Redis |
| `X-RateLimit-*` | 只有 `Retry-After` | 补 Limit / Remaining 头 |
| 一言参数能力 | `type` / `min` / `max` / `count` / `callback`（JSONP）均未实现 | 实现后回补参数表与 schema |
| 语料更新 | 进程内缓存，改文件需重启（或让缓存失效）才生效 | 接数据库或加失效 / 热更新机制 |
| 写接口模板 | 本文件只覆盖公开 GET | 写接口需 `auth:true` + `permission` + CSRF 头 + `ok()`（ApiSuccess），另见 `app/api/v1/settings/route.ts` |
| 分页 / 列表接口 | 未覆盖 | 用 `paged()` + `paginationSchema`，参考 `app/api/v1/apis/route.ts` |
| 新接口的文档 | 车单里 10 个接口的文档都已撰写；后台「接口管理」新建的接口先拿到骨架页（标「待补充」+ noindex） | 实现服务端路由后，复制 `apis/answerbook.ts` 撰写、登记进 `API_DOCS`，并把 id 补进 `IMPLEMENTED_API_IDS` |

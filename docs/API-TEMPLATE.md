# 新增接口模板（以一言 /api/v1/hitokoto 为范例）

> 用途：新增**对外公开接口**时按本文件落地，避免只写路由、漏掉类型 / 客户端 / 目录 / 文档导致接口「能跑但不能用」。
> 参考实现：无参数接口看 `hitokoto`（`app/api/v1/hitokoto/route.ts` + `lib/server/hitokoto.ts` + `components/docs/apis/hitokoto.ts`）；带 query 参数、要读外部数据源的看 `wallpaper`；上游榜单类看 `hotsearch`。
> 一句话原则：**数据形状定义一次（types），读取一次（lib/server），信封一次（envelope: 'public'），调用一次（publicGet）**。

## 1. 一个接口要碰的六处登记

只有六处是必需的，其余按需。少一处登记 = 接口「能跑但不能用」。

| # | 文件 | 做什么 | 一言里的对应 |
|---|---|---|---|
| 1 | `types/domain.ts` | 返回形状（前后端共用，别放 `lib/server` 里给客户端 import） | `HitokotoLine` |
| 2 | `lib/server/<name>.ts` | 数据源：`import 'server-only'` + 套现成外壳，别自己写缓存 | 语料用 `createCorpusCache`，上游榜用 `createBoardCache`，素材用 `listAssets()` |
| 3 | `app/api/v1/<name>/route.ts` | `defineRoute({ auth: false, envelope: 'public', route: API.publicApi.<name> })` + `publicOk(data)`；路径从 `lib/api/endpoints.ts` 取常量，别写字面量 | 见参考实现 |
| 4 | `lib/zod/public.schema.ts` | **仅在有参数时**定义 query schema；query 用普通 `z.object`，多余参数被忽略（`.strict()` 只用在体上，公开接口都是 GET，没有体） | 无参数则整层省略 |
| 5 | `constants/api-catalog.ts` | 车单条目（id/name/en/path/cat/method/desc/kw/hint/demo），`path` 写 `API.publicApi.<name>` 引用、别再打一遍字面量；并把 id 补进 `IMPLEMENTED_API_IDS` | `id: 'hitokoto'` |
| 6 | `components/docs/apis/<slug>.ts` + `registry.ts` + `authored-slugs.ts` | 一页文档并登记，页面由 `app/docs/[slug]/page.tsx` 自动生成；模块顶上同样 `const path = API.publicApi.<name>`；八节外壳全部用 `commonSections.ts` 的构建器（见 §2.1） | `hitokotoDoc` |

前端封装不用手写：`lib/api/endpoints.ts` 加一行路径常量，调用点用 `lib/api/admin-api.ts` 里现成的 `publicGet<T>(path, query)`（它已经把单层信封、`anonymous`、`skipAuthRefresh` 三件事固定下来）。

展示层按需：要上市广场卡片则加 `DemoKind` 与 `components/plaza/demos/*`；要上首页则补 `constants/card-layout.ts` 的默认跨度。两者都不做也不影响接口可用，卡片会落到 `DemoFallback`。

`npm test` 的 `catalog-sync.test.ts` 会核对：车单 id ↔ `IMPLEMENTED_API_IDS` ↔ 真实路由目录 ↔ 文档登记四者一致，`path` 必须由 id 拼出。改完跑一次测试比靠人记忆可靠。

## 2. 文档文案风格（所有接口文档统一按这一套写）

范例：口吻照 `components/docs/apis/answerbook.ts`、`components/docs/apis/hitokoto.ts`；**详略照 `components/docs/apis/hotsearch.ts`**（去掉骨架 1,450 字，带参数的接口按它对齐节奏；`hitokoto` 的 911 是「无参数、单对象返回」那种接口才够得着的下限）。

**总原则：文风要暖，像同事坐在旁边给你讲，而不是机器在打印规格表。** 准确性不让步，但每一格文字都尽量落在「一句人话 + 必要数字」的节奏上。

### 2.1 一节都不用手写外壳

`components/docs/commonSections.ts` 已经把八节里七节的骨架收走了（`overview` 各接口自己写）。新文档按下面这些调用组装 `sections`，**不要手抄 `{ id, title, content }` 结构**，也不要重写信封行、405 行、限频行——那正是历史上「改一处漏九处」踩过坑的地方：

| 你要写的 | 用这个 | 它替你固定了什么 |
|---|---|---|
| 请求方式一节 | `requestSection({ path, lead? })` | 方法 / 鉴权 / Content-Type / 协议四行全文 |
| 请求参数一节 | `paramsSection(rows?, callout?, lead?)` | 节名与节序；`rows` 省略即免参占位表 |
| 返回参数一节 | `responseSection(dataDesc, rows, callout?, lead?)` | 信封七行（`statusCode`…`site`）与父子顺序，你只写业务子字段 |
| 响应头一节 | `headersSection({ cache, cacheExample?, traceId })` | 七行固定，只有 `Cache-Control` 说明随接口 |
| 错误码一节 | `errorsSection(rows, { hasValidation, callout? })` | 总述段（有无 `issues` 那句按 `hasValidation` 变） |
| 速率与缓存一节 | `limitsSection(rows)`、更新日志一节 `changelogSection(rows, callout?)` | 表格外壳；`changelog` 的 `callout` 是历史页留的位，新页别用 |
| 错误行 | `METHOD_NOT_SUPPORTED_ROW`、`rateLimitedRow(suggestion)`、`validationRow({ label, message, field?, suggestion })`、500 那一行的建议句 `SERVER_ERROR_SUGGESTION` | 405 / 429 / 422 的说明文字 |
| 限速与超实行 | `RATE_LIMIT_ROW`、`TIMEOUT_LIMIT_ROW`（本地数据源）、`UPSTREAM_TIMEOUT_ROW`（会抓上游）、`CACHE_IMPL_ROW`（进程内存缓存） | 「服务端等待上限 8 秒」这类数字与实现对齐 |
| 榜单的 `cached` 字段行 | `cachedRow(ttl)`（ttl 写「60 秒」「5 分钟」这种人话） | `cached` 在九篇里是同一个语义（含兜底期先回旧数据那段），只有 TTL 说法不同 |
| 代码窗 | `successPane({ label, dataJson, requestId, serverTime })`、`failurePane({ statusCode, message, requestId, serverTime, description?, issues?, trailingComment? })` | 信封文字与缩进；`dataJson` 原样嵌入实测 JSON |
| `overview` 第二段 | `envelopeOverview('即业务数据')` | 信封总述整段；错误节的总述段由 `errorsSection` 自己按 `hasValidation` 生成 |

**422 那句 `message` 不在文档里手写。** `lib/zod/public.schema.ts` 把每条非法值文案导出成 `*_HINT` 常量（枚举类的由 `enumHint()` 从取值表生成），文档模块 import 它填进 `validationRow`、`failurePane` 与 `issues` 三处。一篇文档里这句话出现四次，手抄一次就多四次漂移机会——第十五轮加 B 站平台时，文档与 README 各漂了一处。新接口加参数：先在 schema 里导出文案常量，zod 与文档共用它。

**参数的合法值也只有一个出处：`constants/<一类一表>`。** `weather-cities.ts`（39 城）、`gold-contracts.ts`（6 合约）、`stock-markets.ts`（5 个市场前缀 + 时区 + 量纲系数）、`warning-signals.ts`（13 类型 / 4 等级 / 31 区域）都是这种码表：schema 从它生成提示与校验，文档从它生成取值列表，数据源从它取时区与单位。**上游只认中文筛选值、而本站参数面不放汉字**时（预警就是），码表的键取拼音、值存中文，翻译发生在服务端一处。

剩下的才是作者本人的活：`overview` 首段、各接口自己的 500/503 行（建议句能用 `SERVER_ERROR_SUGGESTION` 就用）、字段行的 `description`、callout 正文、三语请求样例。

### 2.2 文字量与顺序

- 详略看**本篇自己写的字**：正文去掉空白后，固定骨架实测占 **1,562 字符**（廿一篇同一份，砍不动也不该砍；第十九轮为出口闸那句「503 有两种来源」从 1,482 涨到它，各篇正文按口径重算后一字未变）。预算按扣掉它之后算：最早十篇落在 **1,418–1,796**，`netease` 1,998（11 个返回字段 + 三条 422 规则 + 12 个内置榜单名）；免参接口可以更省——`soulsoup` 1,040、`kfc` 1,012，只剩一个数据对象的 `hitokoto`（911）算下限。**字段表长的数据类接口会稳定过 2k**：`stock` 3,261（29 个字段，跨市场量纲与三种时刻形态都要各交代一次）、`warning` 3,408（16 个字段 + 四个参数 + 三条 422 + 「类型口径只认官方十三类」与「剩余页并行取」两条规则）、`wallpaper` 2,925（四个来源，每张字段表都要交代一次，另有一条「站内直链何时生效」的规则）、`weather` 2,669（20 个字段 + 39 个城市键全列出来）、`typhoon` 2,525（两种响应形状 19 行）、`exchange` 2,289（25 个币对的方向差异）、`gold` 2,086。过 2k 先砍引导性段落（第十四轮就是照这条把壁纸的三处 lead 删掉的），**不是砍字段行**——字段行是契约，砍了就是少告诉调用方一件事。代码窗不在这个口径里（廿一篇的窗体是 902–3,327 字符），它是实测响应，不参与「写了多少话」的计数。
- 分节固定 8 个：`overview` / `request` / `params` / `response` / `headers` / `errors` / `limits` / `changelog`，外加 `requestPanes`、`responsePanes` 两个代码窗。没有的内容也要留节并写清「没有」。
- `overview` 第一段从**使用场景**起笔（「想知道此刻大家都在聊什么，得把四个 App 挨个打开看」），讲这个接口替你省掉哪一步；第二段才讲信封。不要一上来复述字段名。
- **`request` / `params` / `response` 三节不写引导段**（「一行 GET 就够了…」「只有一个可选参数…」「响应体是一个 UTF-8 的 JSON 对象，字段摊开来看：」）。`lead` 参数是给「表格前确实有一句非说不可」留的位，不是给复述用的；空字符串的 `para(...text(''))` 会渲染成 16px 空白，尤其不要传。`overview` 已经交代过的事不在节首复读。
- 字段行的 `description` 控制在**十几个字**，一句话说清这是什么、拿它怎么办（「排名」、「命中 60 秒缓存时为 true」、「累计票房原文，是给人看的字符串不是数值」）。别在表格里塞上游端点、换算过程、踩坑史，那些留给 `limits` 和 callout。
- `changelog` 只放表格，不要尾巴 callout；`limits` 里「缓存实现」写「单进程内存表」就够，Redis 那句待办在 `docs/REDUCTION-PLAN.md` 记着，不必每篇复述。
- 表格里的 `description` 也要带语气，别写成字段名复读：说清**为什么是这样、拿它怎么办**（例：`url` 写「别把它当主键存库——要存就存 id」；`score` 写「缺省时是 null 而不是 0」）。
- 用第二人称、短句、日常动词；允许一句轻的幽默（「毕竟很少有人真的往下翻到第 200 名」）。不要堆形容词，不要抒情，不要「赋能 / 一站式 / 轻松搞定」这类话。
- 每节最多一个加粗 callout，挑**最容易被误解的那一点**（例：「答案与问题无关。」「热度数字不能跨平台比。」），再用一两句解释，不要堆三条以上。
- 上游不给的东西就直说不给，并说明为什么不去凑（「没有 url 字段。」「我们不去别处拼一个看着像评分的东西给你。」）。
- 写进文档的每个数字、每条字段行为都必须 `curl` 实测过；没测过的（SLA、平均响应时间、可用性百分比）一律不写。
- 语料/内容类的风格事实，**给真实取值举例**比给统计数字好读：写 `Ask heaven and earth, ask yourself` 这种真实串，而不是「约 128 条标题式」。
- 代码窗的示例响应直接粘真实 `curl` 输出（含真实的 `requestId` / `serverTime` 形态），不要凭想象编一个看起来合理的。**标点与完整取值也照抄**：一言的样例曾把语料里的「，」写成半角、把 `source` 从「蝶恋花·阅尽天涯离别苦」缩成「蝶恋花」，现在 `tests/doc-samples.test.ts` 拿语料逐字段比对，抄错直接红。
- 不要把特性排比塞进正文（「免鉴权、无参数、单层信封、限频 120」），表格已经表达了，正文重复就是机械味。
- `facts` / `metaRows` 保持克制：`facts` 1–2 条，`metaRows` 只放能证实的行，且不与 `facts` 复读同一句。限频文案统一用 `commonSections.ts` 的 `rateLimitText`，数字来自 `RATE_LIMIT_PER_MIN_DEFAULT`，不要在文案里重打一遍。
- 未实现、未撰写、依赖外网这类现状要如实标注，不给出会误导人的「假示例」。

## 3. 响应信封：一个接口只有一种形状

公开接口成功与失败同形（`buildPublicBody` 单点产出，`lib/server/response.ts`）：

```jsonc
// 成功
{ "statusCode": 200, "message": "success", "data": {…},
  "meta": { "requestId": "mv1xhxti-561e14ea6824", "serverTime": "ISO8601", "site": "Decamore API" } }

// 失败：data 为 null，statusCode 就是 HTTP 码，按需多出 description / issues
{ "statusCode": 422, "message": "…", "data": null,
  "meta": { "requestId": "…", "serverTime": "…", "site": "Decamore API" },
  "description": "…", "issues": [{ "field": "…", "message": "…", "code": "invalid_type" }] }
```

- 公开信封**没有 `success` 位**，控制台信封（`ok()` / `ApiFailure`）有，`meta` 是 `{ timestamp, traceId }`。两者不跨端混用，也不需要混用：路由声明 `envelope: 'public'`，客户端 `http` 用同名选项解，两端各一处声明。
- `meta.requestId` 与响应头 `x-trace-id` 同值；`meta.site` 取 `APP_NAME`。业务数据只放 `data`，不要往信封顶层加字段。
- `statusCode` 就是 HTTP 码，不存在五位业务码。
- 响应的 gzip 在 `withApiHandler` 出口统一做（`lib/server/compress.ts`），路由与 `publicOk` 都不用自己压：`next start` 只压页面，不压 Route Handler 的响应体。

## 4. 路由骨架（直接复制改名）

```ts
/**
 * GET /api/v1/<name> — <中文名>（公开）
 * 无鉴权、无参数。数据来自 <数据源>，返回单层公开信封。
 */
import { API } from '@/lib/api/endpoints';
import { defineRoute, preflight, publicOk } from '@/lib/server';
import { randomHitokoto } from '@/lib/server/hitokoto'; // ← 换成你的数据源

export const GET = defineRoute(
  {
    auth: false,
    envelope: 'public',
    route: API.publicApi.<name>,
    // 有参数时补：query: xxxQuerySchema,   body 仅写接口用
  },
  async () => publicOk(await randomHitokoto()),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();
```

数据源骨架（读本地 JSON 语料时，`hitokoto` 与 `answerbook` 就是这么写的，不要再手抄 globalThis 缓存）：

```ts
/** 一言语料读取；并发首请求共享同一次读盘 */
import 'server-only';
import path from 'node:path';
import type { HitokotoLine } from '@/types';
import { createCorpusCache } from './corpus';

const corpus = createCorpusCache<HitokotoLine>({
  slot: '__decamoreHitokoto',   // globalThis 上的前缀，改名等于换一份缓存
  file: path.join(process.cwd(), 'public', 'assets', 'json', 'hitokoto.json'),
  emptyMessage: '一言语料为空，请检查 public/assets/json/hitokoto.json',
});

export const randomHitokoto = corpus.pick;
```

`createCorpusCache`（`lib/server/corpus.ts`）负责读盘、解析、缓存、并发首请求合并与「空语料报错」，缓存与 pending 都挂 `globalThis`（Next 按 route 分包，636KB 语料按 chunk 各解析一次就是白付 N 遍）。**只导出有人调的那一个**：`export const loadCorpus = corpus.load` 这种「顺手把内部方法也铺开」的再导出在第十七轮删了两处，路由只用 `pick`，`load` 从来没有调用方。

上游榜单类不要手写上面这段：`createBoardCache({ slot, ttlMs, fetch, toResult? })`（`lib/server/board-cache.ts`）已经把 TTL 缓存、并发合并与 `cached` 标记做好，命中时它自己回填 `cacheHit` 到请求上下文，控制台日志的 HIT/MISS 就来自这里。返回值就是缓存条目时不用传 `toResult`——默认实现会把命中态的 `cached` 标记铺开，其余形状原样返回；只有需要换返回形状（加 `count`、按参数截断）才写它。素材类同理，直接用 `lib/server/static-assets.ts` 的 `listAssets()`。

TTL 过后它不会让请求去等回源：还在兜底期内（一个 TTL，短榜不少于 10 分钟）先回上一份并回填 `cached=true`，刷新交给后台那一路；刷新失败退避 15 秒，期间旧数据照常服务，日志记一条 `board.refresh`。超出兜底期才阻塞取数。对你写的那侧只有两个约束：**缓存的必须是「同一键的上一份还能用」的数据**（当日壁纸、每小时中间价成立；一旦过期就发不出去的东西别挂这个外壳），以及 `toResult` 要能在拿到旧条目时照常拼出结果。缓存键来自调用方参数时（`typhoon?id=`）外壳按 64 个键封顶淘汰，不用你自己管。

**会翻页的上游要并行取页，不要串行。** 上游一页要 1.6–3.8 秒时，串行两页就是 11 秒级的冷取，第一个用户全付。做法是先取第一页拿到 `totalPage`，剩下的页一次 `Promise.allSettled` 并发取完；某一页失败就发已取到的部分并把 `truncated` 标成 true，别因为缺页把整个请求作废。预警接口这条从 11.3 秒降到 2.7–5.5 秒（`lib/server/warning.ts`）。

抓上游失败抛 `UpstreamUnavailableError('<来源名>', 原因)`（`lib/server/errors.ts`），它产出 503 +「<来源名>暂时取不到」，原因进 `description`。不要在数据源里各写一个 `unavailable()` 工厂：第十七轮之前十个文件各有一份同构的，措辞全靠人对齐，文档里的 503 行抄的就是这句话。现有 22 处抛点、十个数据源都用它。

**不要绕过 `lib/server/upstream.ts` 自己 `fetch`。** 那条路上按顺序做了三件事：来源 IP 之外的**出口并发闸**（每个上游主机 6 个在途、多出来的排队最多 1 秒，等不到就抛「上游并发已满」→ 由你换成的 503 说明是哪一家在忙）、连不上/超时的 15 秒冷却、8 秒超时。自己 `fetch` 等于把这三层都跳过，还会让某一家的配额被单个数据源打穿。闸的行为在 `tests/upstream-gate.test.ts`，取值口径见 `REDUCTION-PLAN` §1.23。

## 5. 提交前验证清单

- `npm run verify` 全绿（= typecheck + lint + test：核对登记一致性、信封形状、限流与规则执行、文档里的 8 秒超时与语料样例文本、配置单例的引用不换）。CI 跑的就是这条命令加一步生产构建。
- `curl -i http://localhost:3000/api/v1/<name>`：确认**只有一层信封**、`statusCode:200`、`requestId` 等于响应头 `x-trace-id`。
- `curl -i -X POST …/<name>`：应为 `405` 且**无响应体**（框架直接返回，不进业务信封）。
- 有参数时：非法值必须 `422`、`data:null` 且带 `issues`；多余 query 参数会被忽略（query 不上 `.strict()`，多传 `?foo=1` 照常 200；严格模式只用在写接口的体上）。
- 限流：继承 `RATE_LIMIT_PER_MIN`（默认 120 次/分钟/IP，60 秒固定窗口，超限带 `Retry-After`），新接口无需单独配置。
- 前端真实调用：打开页面看 Network 有该请求且非缓存（别用本地常量冒充「实时演示」）。
- 文档页 `/docs/<slug>`：参数表、返回字段、代码窗三处必须与 `curl` 实测一致；未知 slug 走 404（`dynamicParams = false`）。
- 接口链接一律 `${siteUrl()}/api/v1/<name>`（由 `components/docs/url.ts` 的 `apiUrl()` 统一拼装），**不要在文案里写死域名**。

## 6. 当前边界（新增接口前先读这段）

| 事项 | 现状 |
|---|---|
| 服务端缓存对外可见性 | 命中缓存只体现在日志的 HIT/MISS 与响应体 `cached` 字段，没有 `X-Cache` 头；单进程内存表，多实例部署要换 Redis |
| 频控可见性 | 只有 `Retry-After`，没有 `X-RateLimit-*` |
| 限流按谁的 IP 计 | `resolveClientIp` 取 `x-forwarded-for` 首段 → `x-real-ip` → `cf-connecting-ip`，都没有则 `127.0.0.1`；代理没转发就是全站共用一个桶。种子白名单为空，需要豁免在后台按精确 IP 加 |
| 一言参数能力 | `type` / `min` / `max` / `count` / `callback`（JSONP）均未实现 |
| 语料更新 | 进程内缓存，改文件需重启才生效 |
| 写接口 | 本文件只覆盖公开 GET。控制台写接口要 `auth: true` + `permission` + CSRF 头 + `ok()`，参考 `app/api/v1/settings/route.ts`；分页用 `paged()` + `paginationSchema`，参考 `app/api/v1/apis/route.ts` |
| 后台新建的接口 | 先拿到「待补充」骨架页（noindex），实现服务端路由后才补文档并登记 |

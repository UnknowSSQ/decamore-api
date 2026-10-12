# Decamore API

对外提供公开 JSON 接口的站点与管理控制台，基于 Next.js 15 App Router + React 19 + TypeScript。

仓库里同时跑着三样东西：

- **公开接口**：21 个免鉴权 GET 接口（内容 / 图片 / 数据三类），实现在 `app/api/v1/*/route.ts`。
- **文档站**：`/docs` 与 `/docs/<slug>`，每个接口一页，内容由 `components/docs/apis/<slug>.ts` 提供。
- **控制台**：`/admin` 下的仪表盘、接口管理、调用日志、访问规则、安全设置、卡片布局、网站设置。运行时配置读写 `lib/server/store/{settings,security,rules,users}.ts`（默认进程内单例，可选 Redis 后端），指标与日志读 `lib/server/metrics.ts`（真实调用环形缓冲，刻意不持久化）。

前台另有首页 Live 卡片与 `/plaza` 接口广场，两者与文档共用同一份接口车单。

## 环境要求

- Node.js 18.18 以上（开发环境实测 v24.14）
- npm
- 默认无需数据库：数据来自上游抓取、`public/assets` 目录与进程内状态，没有 ORM 与迁移。多实例部署要共享限流计数与后台配置时，可以把状态后端切成 Redis（见「跨实例状态」一节），仍然是 KV 读写，不是关系库。

## 安装与启动

```bash
npm install
cp .env.example .env.local
npm run env:check
npm run dev
```

站点监听 `http://localhost:3000`。`JWT_SECRET` 必须改成至少 32 字符的随机串，生成方式：

```bash
openssl rand -base64 48
```

本地登录账号在 `lib/server/store/users.ts`，账号 `admin`、口令看那个文件；示例密钥与示例口令都只够本地用。`NODE_ENV=production` 时沿用示例密钥，会在第一个真正读服务端 env 的请求上被拒（实测 `/api/health` 与 `/api/v1/hitokoto` 都回 500 并给出这条原因）；纯静态页不执行服务端代码，仍然照常出。`npm run build` 的收集页面数据阶段不算生产运行，不受这条限制。

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发服务器（Turbopack，`-H 0.0.0.0`）；`npm run dev:webpack` 回退 webpack 编译 |
| `npm run build` | 生产构建 |
| `npm run start` | 运行构建产物 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `eslint .`（用 ESLint CLI，`next lint` 已废弃） |
| `npm test` | Node 内置 test runner 跑 `tests/*.test.ts`（tsx 编译，`tests/register.mjs` 把 `server-only` 打成空模块并补齐测试用环境变量） |
| `npm run verify` | 三道静态门禁串成一条：typecheck → lint → test。**不含 build**，所以 dev server 在跑时也能执行 |
| `npm run env:check` | 校验环境变量是否齐全 |
| `npm run thumbs` | 为 `public/assets/{avatar,emoji,images,wallpaper}` 生成 `*-thumb` 派生图；新增素材后跑一次，缺图 `npm test` 会红 |

## 环境变量

公共变量会以明文打包进浏览器，**不要放密钥**。

| 变量 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | 否 | `http://localhost:3000` | 站点规范地址，文档里的接口链接与资源绝对地址都由它拼出 |
| `NEXT_PUBLIC_API_BASE_URL` | 否 | 空 | 跨域部署时填写 API 基址，同域留空 |
| `JWT_SECRET` | 是 | — | 签名密钥，至少 32 字符 |
| `JWT_ACCESS_TTL_SEC` | 否 | `900` | access token 有效期（秒） |
| `JWT_REFRESH_TTL_SEC` | 否 | `604800` | refresh token 有效期（秒） |
| `COOKIE_DOMAIN` | 否 | 当前域 | 需要跨子域共享会话时设置 |
| `COOKIE_SECURE` | 否 | 生产为 `true` | 本地 HTTP 调试时须设为 `false` |
| `RATE_LIMIT_PER_MIN` | 否 | `120` | 单 IP 每分钟请求阈值，与 `constants/app.ts` 的 `RATE_LIMIT_PER_MIN_DEFAULT` 同源，文档文案读同一个常量 |
| `LOG_LEVEL` | 否 | `info` | `debug` / `info` / `warn` / `error` |
| `KV_BACKEND` | 否 | `memory` | `memory`（单实例，状态挂 `globalThis`）/ `redis`（多实例共享限流计数与后台配置） |
| `REDIS_URL` | `KV_BACKEND=redis` 时必填 | — | 形如 `redis://user:pass@host:6379`，需要运行时能 `import('ioredis')` |

## 目录结构

```
app/
  api/v1/<name>/route.ts   公开接口与控制台接口，统一走 defineRoute
  admin/                   控制台页面
  docs/, plaza/, login/    文档站、接口广场、登录页
components/
  docs/                    文档站渲染层；apis/<slug>.ts 只写各接口自己的内容，分节外壳在 commonSections.ts
  plaza/                   接口广场卡片与各接口 demo
  console/                 控制台视图
  ui/, shared/, landing/   基础组件、公共块、首页分区
constants/                 接口车单、权限、卡片默认布局、路由与频控默认值
lib/
  server/                  服务端实现
    handler.ts             请求管线：频控与黑白名单 → 维护模式 → 鉴权 → CSRF → 校验 → 统计 → gzip
    compress.ts            JSON 响应的 gzip（`next start` 不压 Route Handler 的响应体）
    metrics.ts             控制台唯一取数入口（日志页、仪表盘、报表同源）
    stats.ts               调用环形缓冲与日志记账
    store/                 运行时配置：config.ts 外壳 + settings / security / rules / users
    board-cache.ts         榜单缓存外壳（按键 TTL + 并发合并 + 过期先回旧数据、后台刷新）
    static-assets.ts       素材类接口的目录索引与缓存
    upstream.ts            上游抓取与失败冷却
  api/                     前端请求封装
  auth/                    令牌与会话读写
  zod/                     请求参数与表单校验（前后端共用同一份 schema）
types/                     业务类型（接口返回形状即契约）
utils/                     纯函数：格式化、cn、IP/CIDR 与作用域匹配、双提交判定、固定窗口计数、车单检索打分
tests/                     node:test 用例与 register.mjs 加载钩子
public/assets/             壁纸、头像、表情包、图库与语料 JSON（约 25MB，其中一半是派生图）
docs/API-TEMPLATE.md       新增接口与接口文档的写作规范
docs/REDUCTION-PLAN.md     下一步减负方向
docs/CODE-ANALYSIS-REPORT.md  端到端分析报告，每条结论都标了处置状态（已修 / 已收紧 / 已文档化 / 仍开放）
```

## 请求链路与调用关系

```
浏览器 ─▶ middleware.ts        只做 Cookie 存在性跳转 + 页面安全头 + 生成 x-request-id（Edge，不验签）
       ─▶ defineRoute/handler  频控与黑白名单 → 维护模式（仅公开接口）→ 鉴权与权限 → CSRF → Zod 校验
                                 → 业务 handler → 统计记账（环形缓冲）→ 安全头 / CORS / x-trace-id
       ─▶ lib/server/<name>    语料读取、目录扫描、上游抓取与缓存
前端数据流：components/* ─▶ hooks(useRequest / useListQuery / useModalForm / useOptimisticToggle)
                          ─▶ lib/api(admin-api / auth-api / http) ─▶ lib/api/endpoints 的路径常量
控制台取数：app/api/v1/{logs,dashboard,dashboard/export} ─▶ lib/server/metrics ─▶ lib/server/stats 环形缓冲
Server Component 页面：app/admin/* ─▶ lib/server/guards.guardPage（真正的验签在这里）
```

## 接口返回格式

**一个接口只有一种信封形状**，成功与失败同形。

公开接口（`defineRoute` 里声明 `envelope: 'public'`，实测 2026-10-11）：

```jsonc
// 200
{
  "statusCode": 200,
  "message": "success",
  "data": { "content": "我也想杀死伤痛，让那恩怨有始有终。", "creator": "刘森", "source": "县城" },
  "meta": { "requestId": "mv3rdw6n-35fd61484e35", "serverTime": "2026-10-11T11:47:38.932Z", "site": "Decamore API" }
}

// 422 / 429 / 503 等失败：同一个结构，data 为 null，按需多出 description 与 issues
{
  "statusCode": 422,
  "message": "platform 只能是 weibo、douyin、baidu、zhihu、bilibili 或 toutiao",
  "data": null,
  "meta": { "requestId": "mv3rdwa2-3af267f1c25f", "serverTime": "2026-10-11T11:47:39.051Z", "site": "Decamore API" },
  "description": "platform：platform 只能是 weibo、douyin、baidu、zhihu、bilibili 或 toutiao",
  "issues": [{ "field": "platform", "message": "platform 只能是 weibo、douyin、baidu、zhihu、bilibili 或 toutiao", "code": "invalid_type" }]
}
```

控制台接口（`ok()` / `created()` / `paged()`）带 `success` 位，`meta` 是 `{ timestamp, traceId }`；失败体由 `buildFailure` 统一产出。两端各自内部同形，不跨端混用：客户端 `lib/api/http.ts` 用同名的 `envelope` 选项声明要解哪一种。

约定：

- `meta.requestId` / `meta.traceId` 与响应头 `x-trace-id` 同值，报障时提供它即可定位服务端日志；控制台的日志页里 `id` 就是它。
- 公开接口一律 GET，其它方法由框架直接返回 `405`（无响应体）；21 个公开接口另导出 `OPTIONS` 处理跨域预检。
- 默认限流按「IP + 方法 + 路由模板」计数（`/api/v1/apis/[id]` 这一类合用一个桶），窗口 60 秒，阈值取 `RATE_LIMIT_PER_MIN`，超限返回 `429` 与 `Retry-After` 头。
- 这里的 IP 由 `resolveClientIp`（`lib/server/trace.ts:67`）依次取 `x-forwarded-for` 首段、`x-real-ip`、`cf-connecting-ip`，三个头都没有时落到 `127.0.0.1`。**反向代理必须转发其中一个**，否则全体客户端共用一个计数桶，限流会表现成「整站共享一份配额」。这些头可被伪造，所以风控不单独信它。
- 参数不合法返回 `422`，并在 `issues` 里点名字段。
- 请求带 `Origin` 且该来源在后台「安全设置 · CORS」里时，`/api` 响应才附 `Access-Control-Allow-Origin` 与 `Vary: Origin`。不下发 `Allow-Credentials`，控制台接口仍需同源调用。
- 后台的 IP 黑名单命中直接 `403`；白名单只豁免频控与访问规则，不豁免黑名单，也**不影响能不能进控制台**。种子默认两个列表都是空的：原先的 `10.0.0.0/8`、`172.16.0.0/12` 太宽（配合上面的 IP 兜底等于全线免检），黑名单里摆着的两个是文档保留地址，谁也没挡住。请求体上限、全局限额与「访问规则」页的策略都按配置在 `withApiHandler` 里执行，页面导航不参与这套判定。
- 上面这些桶都是**按来源**计数的，压不住「很多来源合计把上游打爆」。所以另有一道**出口闸**（`utils/upstream-gate.ts`）：对每个上游主机最多 6 个请求在途，第 7 个起排队最多 1 秒，等不到名额就返回 `503`（`description` 写明「上游并发已满」）。它按主机分闸，慢上游（气象预警一次全量要 1.4–6.4 秒）不会拖住快上游（行情 5–18 毫秒）；它是进程内的，多实例部署时合计出口并发是 6 × 实例数。所有回源都过 `lib/server/upstream.ts` 这一条路，没有第二个入口。
- 规则处置只有三种真实行为：`429`（限流并带 `Retry-After`）、`reject`（`403`）、`log`（只记账不改变响应）。同一路径命中多条规则时取作用域最具体的一条，不叠加。
- 种子访问规则除「登录接口保护」外都是 `enabled: false`：规则现在真的会拦，默认启用比上面口径更严的种子值会让线上限额凭空变低，要开请在后台改。
- 后台「维护模式」开启后，21 个公开接口统一返回 `503`，控制台接口与文档页不受影响（否则关不掉开关）。那句提示由 `API_CATALOG.length` 派生，不再手写数字。

公开接口一览：

| 路径 | 参数 | 数据来源 | 缓存 |
| --- | --- | --- | --- |
| `/api/v1/hitokoto` | 无 | `public/assets/json/hitokoto.json` | 语料常驻进程内存 |
| `/api/v1/answerbook` | 无 | `public/assets/json/answerbook.json` | 语料常驻进程内存 |
| `/api/v1/wallpaper` | `type=pc/mobile/bing/nasa` | 本地图库 + 必应当日图 + NASA 每日一图（APOD） | 上游各 1 小时；当日图镜像进 `public/assets/wallpaper/`，本次启动前落盘的才给站内直链 |
| `/api/v1/hotsearch` | `platform=weibo/douyin/baidu/zhihu/bilibili/toutiao`、`limit` | 六家平台榜单 | 60 秒 / 每平台 |
| `/api/v1/hotmusic` | `platform=qq/netease/kugou`、`limit` | 三家音乐平台榜单 | 60 秒 |
| `/api/v1/hotplay` | `type=tv/movie/variety`、`limit` | 欢网大数据播出榜 | 10 分钟 |
| `/api/v1/hotchart` | `limit` | 猫眼实时票房榜 | 1 小时 |
| `/api/v1/emoji` | `type=menhera`、`limit` | `public/assets/emoji` | 10 分钟 |
| `/api/v1/avatar` | `type=boy/girl/anime`、`limit` | `public/assets/avatar` | 10 分钟 |
| `/api/v1/images` | `type=beauty/pretty`、`limit` | `public/assets/images` | 10 分钟 |
| `/api/v1/poetry` | `dynasty=tang/song` | `public/assets/json/poems.json` | 语料常驻进程内存 |
| `/api/v1/idioms` | `limit`、`chars=4~8` | `public/assets/json/ChengYu.json` | 语料常驻进程内存 |
| `/api/v1/soulsoup` | 无 | `public/assets/json/soul.json` | 语料常驻进程内存 |
| `/api/v1/kfc` | 无 | `public/assets/json/kfc.json` | 语料常驻进程内存 |
| `/api/v1/netease` | `id`=歌单 id | 网易云音乐（歌单曲目 + 歌曲详情 + 评论列表，实测免 cookie 免签名） | 曲目 10 分钟；评论每次现取 |
| `/api/v1/typhoon` | `id`=台风内部 id | 中央气象台台风网（列表 `list_default` / 路径 `view_<id>`，JSONP 免 key） | 10 分钟；不传 id 给编号列表 |
| `/api/v1/exchange` | 无 | 中国外汇交易中心 `ccpr.json`（每交易日 9:15 的人民币中间价，免 key） | 1 小时 |
| `/api/v1/weather` | `city`=拼音键（39 城） | 中国天气网 `d1.weather.com.cn` 实况端点（免 key，城市码表在 `constants/weather-cities.ts`） | 5 分钟 / 每城市 |
| `/api/v1/gold` | `contract`=六个合约之一 | 上海黄金交易所官网分时行情（免 cookie 免签名，开 / 高 / 低由分时算） | 60 秒 / 每合约 |
| `/api/v1/stock` | `codes`=前缀+代码，最多 20 个 | 腾讯行情 `qt.gtimg.cn`（免 key，GBK；沪 / 深 / 北 / 港 / 美一次取完，量纲统一成股与元） | 不缓存，每次现取 |
| `/api/v1/warning` | `type`(13) / `level`(4) / `region`(31) / `limit` | 中央气象台 `www.nmc.cn` 的 `rest/findAlarm`（免 key；中文筛选值由 `constants/warning-signals.ts` 翻，全量取回后本地筛） | 60 秒 / 全量一份 |

`limit` 基本口径是「可选且无默认」：不传给全量，加了默认值会静默改变既有调用方拿到的结果。两处例外要说清：素材类接口的 `limit` 是随机取 N 条而不是前 N 条（目录本身无序），`total` 仍是全量；成语的 `limit` 默认 1（一查一条是它的用法，没有全量语义，上限 100）。

上游那几类的 TTL 到期后不是立刻让请求去等回源：过期但还在兜底期内的，先把上一份发出去（`cached` 仍为 true），同时由后台那一路去刷新，下一次请求就换新。兜底期是一个 TTL，短榜再兜到不少于 10 分钟——热搜那 60 秒的榜最坏给 11 分钟前的数据，汇率那一小时的最坏给 2 小时；超出兜底期就当没有缓存，正常阻塞取数，宁可慢或 503 也不把很久以前的榜当真。后台刷新失败会退避 15 秒再试，期间旧数据照常服务，日志里留一条 `board.refresh` 警告。

健康检查：`GET /api/health`。另有 `GET /api/v1/plaza`（接口车单的检索接口，后台「卡片布局」编辑器在用；前台广场页由服务端直接读车单，不走这个端点），它与 `/api/health` 走控制台信封 `ok()`，不是公开信封。

「卡片布局」页（`/admin/cards`）编辑首页与广场两套 12 列网格：**数组顺序就是前台渲染顺序**，跨度按接口 id 匹配。广场默认顺序因此可控，但搜索命中仍按相关性排（实测把默认布局整个倒过来，广场首屏变成「气象预警 → 行情 → 金价…」，而搜「一言」第一条还是 `hitokoto`）；布局里还没有的接口（后台新增的）按车单顺序接在末尾，不会消失。行可拖动排序，把手上也接了 ↑/↓ 键，读屏与键盘路径都走得通。

## 控制台的数据是真的

日志页、仪表盘、报表导出都读 `lib/server/stats.ts` 的调用环形缓冲（`lib/server/metrics.ts` 统一取数），记录的是本进程真实处理过的请求：状态码、耗时、来源 IP、traceId、会话用户。几条口径要说清楚：

- 环形缓冲容量 500 条，进程重启清零。区间选 7d / 30d 时，能报的也只是缓冲里这 500 条覆盖到的时间跨度，宁可少报也不编数字。
- KPI 的对比项是「前一等长区间」的真实差值；没有可比区间时显示持平而不是箭头。
- 缓存列由 `board-cache.ts`、`static-assets.ts` 在命中时回填，所以榜单四类、素材三类、壁纸（bing / nasa 的当日结果）与网易云（歌单曲目列表）会给 HIT / MISS；纯语料类（一言、答案之书、古诗词、成语、毒鸡汤、kfc）没有这层缓存，显示 `—`。
- 日志的 IP 筛选按网段匹配（支持 CIDR），与黑白名单同一套 `utils/net.ts` 实现。
- 接口管理页每行的调用量 / 平均耗时 / 错误率同样来自这个缓冲，`0` 表示没观测到。
- 「还不知道」不写成 0：日志页四个汇总卡在请求失败或尚未返回时显示 `—`（数据来自服务端按同一批筛选算好的 `summary`，不是当前页）。作用域写进标题——「本页状态码分布」数的是当前这一页，与上方「当前筛选」那一排不是一个口径。
- 接口状态只有 `online` / `degraded` 两值：后台那个开关写不出第三种，所以筛选项与 schema 里也不留 `offline`。
- 控制台的错误提示带上 `编号 <traceId>`（与响应头 `x-trace-id` 同值），截图就能定位到服务端日志；表格的 `<th>` 带 `scope` / `aria-sort`，可点的行也能用 Enter / 空格键盘激活。

## 部署：单实例默认，多实例挂 Redis

### 上传哪些文件、怎么起

`npm run build` 之后，服务器上运行只需要四样，其余都可以不带（下面每条都在 2026-10-12 拿一个只装这些的空目录起过进程，页面与接口都是 200）：

| 必须上传 | 实测体积 | 少掉会怎样 |
| --- | --- | --- |
| `.next/`，但可以不带 `.next/cache` | `.next` 共 156 MB，其中 cache 占 148 MB，真正运行要用的是 8 MB | 起不来 |
| `public/` | 28 MB（476 个文件） | 进程正常、`/api/health` 也 200，但语料类接口 500（`ENOENT ... hitokoto.json`）、`/assets/json/*.json` 404 |
| `package.json` | 1,286 字节 | 没有 `npm run start` 这个脚本入口 |
| `node_modules/` | 在**目标机器上** `npm ci --omit=dev` 装 | `next: 未找到命令` |

`app/`、`lib/`、`components/`、`tsconfig.json` 都是构建期才需要的源码，运行期不用带。**`next.config.ts` 也不用带**：`/assets/**` 那两条缓存头在构建期就被烘进 `.next/routes-manifest.json`（实测把它移走后，图片仍下发 `public, max-age=31536000, immutable`，json 仍是 `max-age=300, stale-while-revalidate=600`）——反过来说，改了 `next.config.ts` 必须重新 build 才生效，光重启没用。

`npm ci --omit=dev` 够用这条也是量的：Next 自己写出的运行时依赖清单 `.next/next-server.js.nft.json` 里只出现 14 个包（`next` / `react` / `react-dom` 和它们自带的依赖），`server-only`、`typescript`、`eslint`、`postcss`、`tailwindcss`、`tsx` 这些 devDependencies 都不在其中。反过来，**别把这台 Windows 机器上的 `node_modules` 整包拷到 Linux**：本机 `node_modules/@next/` 下只有 `swc-win32-x64-msvc` 这一个平台的二进制，换系统就是缺件。

```bash
# 服务器上，项目目录内
npm ci --omit=dev
nohup npm run start > app.log 2>&1 &      # 换端口：npm run start -- -p 8080
```

`nohup` 的第一个参数必须是可执行文件，`start` 只是 `package.json` 里的脚本名——`nohup start` 就会报你看到的 `failed to run command 'start': No such file or directory`，得写 `nohup npm run start`，或者绕过 npm 直接 `nohup npx next start -H 0.0.0.0 -p 3000`。第一次部署建议先前台跑 `npm run start`，看清报错再后台化。

### 环境变量：这站是「先起来、再报错」

`env/index.ts` 用一个 zod schema 校验全部变量（缺键时报错会把所有问题一次列全），`JWT_SECRET` 必填且至少 32 字符，生产环境还拒绝沿用 `.env.example` 里那行示例值：

```bash
printf 'NODE_ENV=production\nJWT_SECRET=%s\n' "$(openssl rand -base64 48)" > .env.local
```

要留神的失败形态是：**变量不对不影响进程启动**。实测无 `JWT_SECRET` 时 `next start` 照样 `✓ Ready in 629ms` 并监听端口，示例密钥那台也一样，但此后每一个 `/api/*` 都回 500，日志里是 `环境变量校验失败，请检查 .env.local` + `- JWT_SECRET: Required`；而 `/`、`/docs` 是构建期预渲染的静态页，它们仍然 200。所以**首页能打开不等于部署成功**，起来之后按这三条验收：

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/api/health              # 200 = 变量齐
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/assets/json/hitokoto.json # 200 = public/ 到位
curl -s http://127.0.0.1:3000/api/v1/answerbook | head -c 200                            # 出 JSON = 读盘与渲染都通
```

其余变量都有默认值：`RATE_LIMIT_PER_MIN=120`、`LOG_LEVEL=info`、`JWT_ACCESS_TTL_SEC=900`、`JWT_REFRESH_TTL_SEC=604800`、`KV_BACKEND=memory`；`NEXT_PUBLIC_*` 两个是构建期内联的，改了要重新 build，运行时改环境变量对它们无效。

运行期还会往 `public/assets/wallpaper/` 写当日镜像（必应、NASA 各一张），所以那个目录要**可写**；`lib/server/wallpaper.ts:191` 的 `MIRROR_KEEP_DAYS = 7` 会在装载图库时按 mtime 清掉七天前的，长不大。

### 跨实例状态

跨实例需要共享的状态收敛到一个抽象上：`lib/server/store/kv.ts` 的 `KvStore`，默认内存后端，`KV_BACKEND=redis` 时切到 Redis。接口是 `get / set / del / incr / mget / mset` 加 TTL，`incr` 只在计数首次自增时写过期，所以固定窗口限流可以直接建在它上面。Redis 后端用动态 `import('ioredis')` 建连，构建期不需要装这个包，运行时按需 `npm i ioredis` 即可。

不配 `KV_BACKEND`（默认 `memory`）时行为和以前一样：所有状态挂在 `globalThis` 上，后台改的配置、频控计数都在本进程里累积，单实例部署是自洽的，不用改任何环境变量。

配成 Redis 之后解决了两件事：

- **频控不再随实例数放大**。`protection.ts` 的窗口计数变成共享计数器，实例 N 不会把阈值放大到 N 倍。用的是 `createKvWindowStore`，键按 `floor(now / windowMs)` 分桶，跨实例看到的是同一个桶。
- **后台配置不再各说各话**。三份配置共用 `store/config.ts` 的 `createKvBackedConfig`：冷启动从 Redis 水合一次内存，写操作顺手镜像回去（`mirror()`）。水合与写入都只**原地改**单例（`replaceInPlace`：对象清键再 assign、数组 `length = 0` + `push`），绝不整体重新赋值——Next 按 route 分包，换了引用就只有当前 chunk 看得见新值，这条由 `tests/config-store.test.ts` 钉住。规则的 `hitsToday` 在水合时归零并清记账，运行时计数不跨实例照抄。要注意这是**启动对齐 + 写传播**，不是跨实例实时读：实例 B 改了配置，实例 A 的内存里要等下次重启才变。热更新需要实时一致的场景仍应换成带订阅的存储（Redis pub/sub 或数据库）。

```bash
KV_BACKEND=redis
REDIS_URL=redis://user:pass@host:6379
npm i ioredis
```

还没迁出去的是这两类，多实例下需要另行安排：

- **指标与调用日志**：`lib/server/stats.ts` 的 500 条环形缓冲仍然是每实例一份，仪表盘的 7d / 30d 数字是各实例各自缓冲拼出来的，不是全站真实流量。要多实例看全量指标，接 APM 或把日志吐到集中式存储。
- **只读缓存**：`board-cache.ts`、`corpus.ts` 语料、上游失败冷却都还是进程内缓存。它们只是省一次上游请求，命中率的损失换来的是不引依赖，可以不动。

## 开发注意事项

**可变数据源必须挂在 `globalThis` 上。** 模块级变量在每个 route/page chunk 里各有一份，写入不会跨路由传播，`lib/server/*` 的内存后端与缓存都按这个方式实现。

**改种子数据要同时提升版本号。** `lib/server/catalog.ts` 的 `SEED_VERSION`、`lib/server/store/{settings,security,rules}.ts` 各自的 `*_SEED_VERSION` 决定运行时 store 是否重新播种；只改默认值不 bump，进程里的旧形状会继续生效。

**`store/` 是唯一的服务端可写状态层。** 里面的文件都是后台读写的运行时数据（`protection.ts` 的守卫链直接依赖 settings/security/rules），加上 `kv.ts` 这个跨实例状态抽象，换数据库时改这一层即可。原先的 `mock/` 目录已删：日志与仪表盘接了真实环形缓冲，通知铃铛没有数据源所以整条下架，账号表改名成 `store/users.ts`。这些文件都带 `import 'server-only'`，客户端误引会在构建期报错而不是把密钥打进浏览器。

**新增公开接口按这条链路补齐**：`types/domain.ts` 定义返回形状 → `lib/server/<name>.ts` 实现 → `lib/zod/public.schema.ts` 加参数校验 → `app/api/v1/<name>/route.ts` 用 `defineRoute({ envelope: 'public' })` + `publicOk` → `lib/api/endpoints.ts` 登记路径 → `lib/api/admin-api.ts` 走 `publicGet` → `constants/api-catalog.ts` 登记并补进 `IMPLEMENTED_API_IDS` → 需要卡片则加 `DemoKind` 与 `components/plaza/demos/*` → 写 `components/docs/apis/<slug>.ts`（八节里七节的外壳用 `commonSections.ts` 的构建器，不要手抄）并登记进 registry 与 `authored-slugs.ts`。口径见 `docs/API-TEMPLATE.md`，`npm test` 里的 `catalog-sync.test.ts` 会检查这几处登记有没有对不上。

**依赖上游的接口不做静默兜底。** 上游取不到或结构对不上时返回 `503` 并附失败原因，而不是回一个空 `items`；对上游的等待上限是 8 秒，连不上或超时后有 15 秒冷却。这些端点不是对方公开的文档接口，改版会立刻体现为 `503`。唯一的例外是上面缓存那一节说的兜底期：手里还有没过期的上一份时先发旧数据，让后台去重试，不发空壳。

**控制台写接口需要鉴权与 CSRF 头。** 非 GET 的控制台接口除 Cookie 外还要带 `X-CSRF-Token`（与 `dc_csrf` Cookie 双提交比对）；令牌从 `Authorization` 头来的会话不要求它，因为跨站脚本伪造不出这个头。登录、刷新、登出三个端点本来就没有会话，不参与双提交。

**校验顺序**：`npm run verify`（typecheck → lint → test）→ 起服务用 `curl` 核对接口实际返回；改过组件或路由再单独跑一次 `npm run build`（先确认 dev 没占着 `.next`）。`.github/workflows/ci.yml` 跑的就是这两步。写进 README 与文档页的每个数字、每条字段行为都必须是实测到的，没测过的（SLA、可用性百分比、平均响应时间）一律不写。

**dev server 运行时不要执行 `npm run build`。** 两者共用 `.next`，生产产物会覆盖 dev 的构建缓存，让样式失效甚至进程崩溃；恢复方式是删掉 `.next` 后重启。

**JSON 响应由本站自己压。** `next start` 自带的压缩只作用于页面，Route Handler 是原样出网的：同一个进程里 `/` 带 `Content-Encoding: gzip`，而 `/api/v1/warning` 在客户端声明 `Accept-Encoding: gzip` 时仍发 262,245 字节。`lib/server/compress.ts` 补在 `withApiHandler` 的出口（成功与失败两条路径都过），门槛一千字节，与非 JSON、带 `Set-Cookie`、已编码的响应都不相干。实测：预警全量 264,583 → 21,056 字节，热搜单平台 11,535 → 3,982 字节；压缩本身在 262KB 上是 1.7ms（level 6，Node 24），走 zlib 线程池不占事件循环。

**性能量级（2026-10-11 实测）**：根布局不再读 Cookie，`/`、`/plaza`、`/docs`、`/login` 等都是构建期预渲染的静态页；生产 `next start` 下 TTFB 9–27ms。首屏 JS：共享 chunk 103 kB，`/` 134 kB、`/plaza` 143 kB、`/docs` 127 kB（`/docs/[slug]` 130 kB）。`/docs/[slug]` 仍按请求动态渲染（车单可在后台编辑，文档要反映最新值），改成按需 revalidate 的路线记在 `docs/REDUCTION-PLAN.md`。页面「打开就慢」的量级全部来自 dev 的按需编译：同一台机器冷启后首访 `/` 4.77s、`/plaza` 1.84s、`/docs/hotsearch` 1.83s、`/login` 1.48s，换 Turbopack 后是 0.38s / 0.32s / 0.52s / 0.15s。两边打包器不同，只在生产出现的构建问题 dev 里看不出来，发布前跑一次 `npm run build`。

# Decamore API

对外提供公开 JSON 接口的站点与管理控制台，基于 Next.js 15 App Router + React 19 + TypeScript。

仓库里同时跑着三样东西：

- **公开接口**：10 个免鉴权 GET 接口（内容 / 图片 / 数据三类），实现在 `app/api/v1/*/route.ts`。
- **文档站**：`/docs` 与 `/docs/<slug>`，每个接口一页，内容由 `components/docs/apis/<slug>.ts` 提供。
- **控制台**：`/admin` 下的仪表盘、接口管理、调用日志、访问规则、安全设置、网站设置。业务数据目前是进程内 mock（`lib/server/mock/*`），接口返回以真实实现为准。

前台另有首页 Live 卡片与 `/plaza` 接口广场，两者与文档共用同一份接口车单。

## 环境要求

- Node.js 18.18 以上（开发环境实测 v24.14）
- npm
- 无需数据库：数据来自上游抓取、`public/assets` 目录与进程内 store，没有 ORM 与迁移

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

开发用账号在 `lib/server/mock/users.ts`，账号是 `admin`、口令看那个文件，仅用于本地登录后台。

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 开发服务器（`-H 0.0.0.0`） |
| `npm run build` | 生产构建 |
| `npm run start` | 运行构建产物 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `next lint` |
| `npm test` | Node 内置 test runner 跑 `tests/*.test.ts`（tsx 编译，`tests/register.mjs` 把 `server-only` 打成空模块） |
| `npm run env:check` | 校验环境变量是否齐全 |

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
| `RATE_LIMIT_PER_MIN` | 否 | `120` | 单 IP 每分钟请求阈值 |
| `LOG_LEVEL` | 否 | `info` | `debug` / `info` / `warn` / `error` |
| `API_STATS_PERSIST` | 否 | `false` | 关闭时调用统计只写结构化日志 |

## 目录结构

```
app/
  api/v1/<name>/route.ts   公开接口与控制台接口，统一走 defineRoute
  admin/                   控制台页面
  docs/, plaza/, login/     文档站、接口广场、登录页
components/
  docs/                    文档站渲染层与 apis/<slug>.ts 内容
  plaza/                   接口广场卡片与各接口 demo
  console/                 控制台视图
  ui/, shared/, landing/   基础组件、公共块、首页分区
constants/                 接口车单、权限、卡片默认布局、路由常量
lib/
  server/                  服务端实现：响应信封、限流、鉴权守卫、上游抓取与缓存
  api/                     前端请求封装
  auth/                    令牌与会话读写
  zod/                     请求参数与表单校验
types/                     业务类型（接口返回形状即契约）
utils/                     纯函数：格式化、cn、IP/CIDR 与作用域匹配（net.ts）、固定窗口计数
tests/                     node:test 用例与 register.mjs 加载钩子
public/assets/             壁纸、头像、表情包、图库与语料 JSON
docs/API-TEMPLATE.md       新增接口与接口文档的写作规范
```

## 接口返回格式

公开接口成功时返回单层信封：

```jsonc
{
  "statusCode": 200,
  "message": "success",
  "data": { /* 业务数据 */ },
  "meta": {
    "requestId": "muzg3no6-24626ffc",
    "serverTime": "2026-10-08T11:20:40.871Z",
    "site": "Decamore API"
  }
}
```

任何失败（包括公开接口）使用控制台的错误信封，结构与成功信封不同：

```jsonc
{
  "statusCode": 429,
  "success": false,
  "message": "请求过于频繁",
  "description": "请在 38 秒后重试",
  "data": null,
  "meta": { "timestamp": 1791389339453, "traceId": "muzg2w9n-ddba114c" }
}
```

约定：

- `meta.requestId` 与响应头 `x-trace-id` 同值，报障时提供它即可定位服务端日志。
- 公开接口一律 GET，其它方法由框架直接返回 `405`（无响应体）；10 个公开接口另导出 `OPTIONS` 处理跨域预检。
- 默认限流按「IP + 方法 + 路由模板」计数（`/api/v1/apis/[id]` 这一类合用一个桶），窗口 60 秒，阈值取 `RATE_LIMIT_PER_MIN`，超限返回 `429` 与 `Retry-After` 头。
- 参数不合法返回 `422`，并在 `issues` 里点名字段。
- 请求带 `Origin` 且该来源在后台「安全设置 · CORS」里时，`/api` 响应才附 `Access-Control-Allow-Origin` 与 `Vary: Origin`。不下发 `Allow-Credentials`，控制台接口仍需同源调用。
- 后台的 IP 黑名单命中直接 `403`；白名单只豁免频控与访问规则，不豁免黑名单。请求体上限、全局限额与「访问规则」页的策略都按配置在 `withApiHandler` 里执行，页面导航不参与这套判定。
- 种子访问规则除「登录接口保护」外都是 `enabled: false`：规则现在真的会拦，默认启用比上面口径更严的种子值会让线上限额凭空变低，要开请在后台改。

公开接口一览：

| 路径 | 参数 | 数据来源 | 缓存 |
| --- | --- | --- | --- |
| `/api/v1/hitokoto` | 无 | `public/assets/json/hitokoto.json` | 语料常驻进程内存 |
| `/api/v1/answerbook` | 无 | `public/assets/json/answerbook.json` | 语料常驻进程内存 |
| `/api/v1/wallpaper` | `type=pc/mobile/bing` | 本地图库 + 必应壁纸接口 | 1 小时 |
| `/api/v1/hotsearch` | `platform=weibo/douyin/baidu/zhihu` | 四家平台榜单 | 60 秒 |
| `/api/v1/hotmusic` | `platform=qq/netease/kugou` | 三家音乐平台榜单 | 60 秒 |
| `/api/v1/hotplay` | `type=tv/movie/variety` | 欢网大数据播出榜 | 10 分钟 |
| `/api/v1/hotchart` | 无 | 猫眼实时票房榜 | 1 小时 |
| `/api/v1/emoji` | `type=menhera` | `public/assets/emoji` | 10 分钟 |
| `/api/v1/avatar` | `type=boy/girl/anime` | `public/assets/avatar` | 10 分钟 |
| `/api/v1/images` | `type=beauty/pretty` | `public/assets/images` | 10 分钟 |

健康检查：`GET /api/health`。另有 `GET /api/v1/plaza`（接口车单的检索接口，供前台页面使用），它与 `/api/health` 走控制台信封 `ok()`，不是上面的单层公开信封。

## 开发注意事项

**可变数据源必须挂在 `globalThis` 上。** 模块级变量在每个 route/page chunk 里各有一份，写入不会跨路由传播，`lib/server/*` 的缓存与 mock store 都按这个方式实现。

**改种子数据要同时提升版本号。** `lib/server/catalog.ts` 的 `SEED_VERSION` 与 `lib/server/mock/settings.ts` 的 `SETTINGS_SEED_VERSION` 决定运行时 store 是否重新播种；只改默认值不 bump，进程里的旧形状会继续生效。

**新增公开接口按这条链路补齐**：`types/domain.ts` 定义返回形状 → `lib/server/<name>.ts` 实现 → `lib/zod/admin.schema.ts` 加参数校验 → `app/api/v1/<name>/route.ts` 用 `defineRoute` + `publicOk` → `lib/api` 加前端封装 → `constants/api-catalog.ts` 登记并补进 `IMPLEMENTED_API_IDS` → 需要卡片则加 `DemoKind` 与 `components/plaza/demos/*` → 写 `components/docs/apis/<slug>.ts` 并登记进 registry。文档写作口径见 `docs/API-TEMPLATE.md`。

**依赖上游的接口不做静默兜底。** 上游取不到或结构对不上时返回 `503` 并附失败原因，而不是回一个空 `items`；对上游的等待上限是 8 秒。这些端点不是对方公开的文档接口，改版会立刻体现为 `503`。

**控制台写接口需要鉴权与 CSRF 头。** 非 GET 的控制台接口除 Cookie 外还要带 `X-CSRF-Token`（与 `csrf` Cookie 双提交比对），纯 token 客户端不带该 Cookie 时跳过比对。

**dev server 运行时不要执行 `npm run build`。** 两者共用 `.next`，生产产物会覆盖 dev 的构建缓存，导致样式失效甚至进程崩溃；恢复方式是删掉 `.next` 后重启。

**改动后的校验顺序**：`npm run typecheck` → `npm run lint` → `npm test` → 用 `curl` 核对接口实际返回，文档与页面文案只写实测到的数字。

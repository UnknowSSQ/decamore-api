# 减负方向（REDUCTION PLAN）

这份文件只回答一个问题：**下一步该砍什么、必须守住什么。** 每条都带判断依据与 `文件:行`，可以直接开工；没有依据支撑的猜测不写进来。

基线（2026-10-10）。口径固定为这条命令，后续按同一命令统计，别再换算法：

```sh
find . -path ./node_modules -prune -o -path ./.next -prune -o \( -name '*.ts' -o -name '*.tsx' \) -print | xargs wc -l
```

| 指标 | 四轮之前 | 现在 |
| --- | --- | --- |
| TS/TSX 文件 | 225 | 293 |
| TS/TSX 行数 | 23,305 | 30,148（30 个测试文件 2,300 行；应用源码 263 个文件 27,848 行） |
| 文档区行数 | 4,218（十篇 3,979 + `commonSections.ts` 239） | 6,636（廿一篇 6,140 + 496） |
| 运行时依赖 | 8 | 8（无新增） |
| `npm test` | 74 | 179（新增 random、语料事实、六篇语料样例用例，以及 metrics、统一信封、维护模式、KV 有界性、语料缓存、文档数字、配置单例与 env 示例一致性、廿一篇文档 422 文案与 schema 同源、上游墙上时间换 ISO、出口并发闸、榜单缓存的兜底窗口与键上限、JSON 响应 gzip、卡片布局顺序的用例） |
| 质量门禁 | 只靠人跑 | `npm run verify`（typecheck + lint + test）+ `.github/workflows/ci.yml`（verify 与生产构建两步） |
| 生产构建 First Load JS | 共享 103 kB | 共享 103 kB，`/` 134 kB、`/plaza` 145 kB、`/docs` 128 kB（`/docs/[slug]` 130 kB） |
| 静态预渲染页面 | 0（根布局读 Cookie，整树动态） | 6 页（`/`、`/docs`、`/login`、`/plaza`、`/_not-found`、`/icon.svg`），其余 48 条路由按需渲染 |
| `public/assets` | 25 MB | 25 MB（未动，见 P3） |

**总量为什么反超四轮之前**：文档区从 3,323 涨到 6,636 行、测试从 1,677 涨到 2,287 行，应用源码从 21,468 涨到 **27,845 行**（+6,377）。按分组量给你当下的数：`lib/server` 44 个文件 4,641 行、`constants` 9 份码表 717 行、`app/api/v1` 下 39 个 route.ts 1,062 行、广场 demo 15 份 960 行——第十八轮那 +1,734 行里，两篇新文档占 728（stock 396 + warning 332），两个数据源加一份时刻解析 363，两份码表 143，两条路由 49，一个新用例文件 46，行情与预警两张卡片的 demo 长了 72，其余是类型、schema、车单与热搜那篇的同步。这是真功能在长，不是壳在长——新增的每一行都对应一个对外承诺过字段行为的接口。四轮之前没有分栏统计，从第四轮起用应用源码这一栏当基线，别再跟混合口径比；文件数会因为拆外壳与加用例而上升，单看它得不出结论。

## 1. 两轮已经拿掉的（不要再加回来）

**第一轮：把「说了但不做」的了结**

- **两条假数据链**：`lib/server/mock/{logs,dashboard}.ts` 删除，日志页 / 仪表盘 / 报表改读 `lib/server/stats.ts` 的真实调用环形缓冲，取数集中在 `lib/server/metrics.ts`。随之删除的无源字段与面板：`CallLog.region`、`DashboardStats.{activeKeys,health}`、仪表盘写死的「服务健康 / 最近动态 / 分类调用量」三块面板与假环形图。
- **一整条没有后端的通知功能**：`mock/notifications.ts` + 3 个路由 + `NotificationPopover.tsx`（自带一份硬编码假通知，接口返回空也照样显示）+ 顶栏铃铛。
- **占位开关**：`API_STATS_PERSIST`（`persist()` 只写一条 debug 日志）、`NEXT_PUBLIC_ALLOWED_IMAGE_HOST` + `next.config.ts` 的 `images.remotePatterns`（全站没有 `next/image`）。
- **只存不用的设置**：`siteName` / `siteDescription` / `enableComments` / `maintenanceMessage`；`contactEmail` 与 `icp` 反向接进 `components/shared/SiteFooter.tsx` 成为真字段。维护模式改为**真的挡公开接口**（503），原先只挂一条横幅。
- **接口表面**：`POST /auth/users`（创建不落表）、`allDevices`、`login.totp`、`me.probe`、`refresh` 的 body token、`dashboard?live`、规则动作 `captcha`、表单的 `upstream` / `cacheSec`（校验后即丢弃）、两个「新建」表单里永远进不去的编辑分支。
- **前端重复**：`components/shared/CtaPanel.tsx`（首页与广场各写一遍的联系卡）、`hooks/useOptimisticToggle.ts`（两个视图各抄约 35 行的乐观开关）、`accountSchema` 复用 `detectAccountKind`、十篇文档的限频数字统一到 `RATE_LIMIT_PER_MIN_DEFAULT`。
- **死码**：`scripts/tmp-limit-routes.mjs`、`tests/setup.ts`、`ROLE_LABELS` 两份重复表、8 个未用图标字形、一批从不传的 props、Tailwind 里没人用的 `side` / `max-w-content` / `duration-400|600`。
- **两处不实文案**：首页指标带的「99.9% 可用性」「<80ms」换成能从代码指出依据的四项；一言文档 `metaRows` 里同样的两个无据数字删除。

**第二轮：表面与残留**

- 最后一组「能改不生效」：`ManagedApi.authRequired` / `rateLimited`（`lib/server/catalog.ts` 存取、表单有开关、**没有任何 enforcement 或渲染分支读它**）→ 字段、schema、表单开关一并删除，`SEED_VERSION` 同步 bump。
- 侧栏底部的装饰性假状态：「全部系统运行正常 · 最近 90 天可用性 99.97%」与 `console v2.6.0 · region cn-east`（`CONSOLE_VERSION` / `CONSOLE_REGION` 两个手改常量）→ 删掉，只留 `v{APP_VERSION}`（版本唯一真值是 package.json）。
- `ERROR_CODE` 里从未发出的三个码（`BAD_REQUEST` / `METHOD_NOT_ALLOWED` / `CONFLICT`）删除，405 由框架直出无响应体，400/409 全仓无人构造；`RequestErrorCode` 里的 `'ABORTED'` 同理。
- `ROLES` 对象只为派生一个字面量类型而存在 → 直接 `export type Role = 'admin'`。
- **第三重定义合一**：`HttpMethod` / `ApiCategory` 此前在 `types/domain.ts`、`lib/zod/common.ts`、`constants/api-catalog.ts` 各写一遍，现在字面量只住在 `types/domain.ts`（`HTTP_METHODS` / `API_CATEGORIES`），Zod 与表单选项都从它派生，注释里那句「须保持一致」的祈祷文一并删除。
- **环形缓冲容量合一**：`500` 原先在 stats 与三处 UI 文案里各写一遍 → 新增 `constants/app.ts` 的 `CALL_RING_CAPACITY`（放这里而不是 stats，因为 stats 带 `server-only`，客户端组件读不到），文案改为插值。
- **日志汇总类型合一**：`CallLogPage.summary` 的结构原先在 `types/domain.ts` 与 `lib/server/metrics.ts` 各声明一份 → 单点 `LogSummary`。
- **对外暴露面收窄 65 处 / 34 个文件**：只在自己文件内使用的 `export` 关键字全部去掉（`ApiHandler`、`RouteContext/RouteConfig`、`LogFields`、`BoardCacheConfig`、`SECURITY_HEADERS`、`PREFLIGHT_HEADERS`、`VerifyResult`、`buildUser`、11 个 zod 中间 schema、`tokenize/scoreApi/…` 等），并删除真正无人使用的 `AppRoute`、`Textarea` 组件（上一轮删掉两个 textarea 字段后它就成了孤儿）、`demos/index.ts` 的两行死转发。判断标准是编译器可验证的：收窄后 `tsc` 仍零错误，说明没有任何跨模块引用。
- 工具链：`npm run lint` 从已废弃的 `next lint` 迁到 `eslint .`，`scripts/*.ts` 加 `no-console` 例外（CLI 脚本本来就该往终端打字）。迁移顺带查出两个 `next lint` 掩盖的问题（`ROLES` 只作类型用、脚本的 console 告警）。

## 1.5 第三轮：审计新落地的 KV 层（不改设计，只补它漏掉的不变量）

`lib/server/store/kv.ts` 把限流计数与后台配置统一到「内存挂 globalThis + 可选 Redis」这一层上，方向没问题（多实例下限额不再被实例数放大）。审出三处，三处已修：

1. **内存后端丢了容量**。限流键的形状是 `rl:<桶>:<窗口序号>`，窗口一换那个键就永远不会再被读到，`get`/`incr` 的惰性删除碰不到它；而旧的 `createWindowStore` 正是为此带 `capacity 5000` + `purgeExpired`（注释原话「桶只增不减会顶满内存」）。换成 KvStore 后这层没了 → 默认内存后端下随流量线性增长。补回 `MEMORY_KV_CAPACITY` 与越界清扫，并用 `tests/kv.test.ts` 钉住不变量：两轮写入后总量有界、过期窗口键被回收、还活着的计数不被误删。
2. **构建被运行期守卫拦住**。三个 store 在模块顶层调 `getKvStore()`，而 `next build` 的 page data 阶段会真的 import 一次路由与 store，且此时 `NODE_ENV=production` —— 示例密钥下「`cp .env.example` 之后第一步 `npm run build`」直接红。改在 `env/index.ts`：用 Next 官方的 `NEXT_PHASE === 'phase-production-build'` 只豁免构建阶段。部署侧仍然拦（实测 `next start` + 示例密钥时 `/api/health`、`api/v1/hitokoto` 都回 500 并给出原因，纯静态页照出，因为它不执行服务端代码）。
3. **可选依赖必须是真可选**。`await import('ioredis')` 用变量承载 specifier 并不能让打包器放手——Turbopack 会常量折叠，构建直接 `Module not found`。补 `webpackIgnore` + `turbopackIgnore`，产物里留下的是运行时 `import("ioredis")`（已在 `.next/server/chunks/*.js` 里核到），并把缺包失败包成一句可操作错误。

**当时留观、第六轮已修的一条**：redis 后端下 store 的冷启动水合是 `SETTINGS = parsed` 这种**整体重新赋值**，而写路径是 `Object.assign(SETTINGS, patch)`。内存后端下永远走不到那个分支；真上 redis 多实例时，重新赋值只改当前 chunk 持有的引用，其它 chunk 会一直读旧值。第六轮把三份同构外壳合成 `store/config.ts` 的 `createKvBackedConfig`，水合改走 `replaceInPlace`（原地清键 + assign，数组走 `length = 0` + `push`），引用不换，并由 `tests/config-store.test.ts` 钉住。方向一直是水合服从「跨 chunk 传播」这条既有约定，而不是把写路径改成重新赋值。

## 1.8 第四轮：十篇文档正文的骨架上收（内容逐字节不变）

`components/docs/apis/*.ts` 从 **3,602 → 2,871 行**（−731），`commonSections.ts` 从 239 → 452 行（+213 全部是共享构建器），**净 −518 行**。做法与结果：

- 新增的构建器：`paramsSection(rows?, callout?, lead?)`、`responseSection(desc, rows, callout?, lead?)`、`errorsSection(rows, { hasValidation, callout? })`、`limitsSection(rows)`、`changelogSection(rows, callout?)`、`successPane({ label, dataJson, requestId, serverTime, value? })`、`failurePane({ statusCode, message, requestId, serverTime, description?, issues?, label?, value?, trailingComment? })`、行常量 `METHOD_NOT_SUPPORTED_ROW`、`rateLimitedRow(suggestion)`、`validationRow({ label, message, field?, suggestion })`、`UPSTREAM_TIMEOUT_ROW`。
- 收掉的重复：405 行 10 篇逐字相同；429 行说明部分 10 篇相同；422 行句式相同、只有 message 与字段名不同；「返回参数」表头与信封七行的包装；`超时与重试`那行 4 篇上游接口逐字相同（其中「服务端等待上限是 8 秒」由 `tests/doc-numbers.test.ts` 与 `UPSTREAM_TIMEOUT_MS` 对齐，改常量即红）；请求/响应代码窗的信封文字。
- 验收方式是这类活的正确姿势：**先把十篇文档序列化成 JSON 快照，改完再序列化，`diff` 必须为空**。任何一处抄漏、多一个空格、pane 少个换行都会被这个 oracle 抓住——它也确实抓到了我漏掉的 `RATE_LIMIT_ROW` 和构建器 `trailingComment` 的插放位置。脚本是一次性的，用完即删；要复用现写二十行即可。
- 并行改十篇时踩到的两条纪律：给正在并行的代理**只用向后兼容的追加参数**改签名（中途改成 options 对象会让它们的调用静默降级成占位表），并且**禁止代理跑 `tsc`**（并发跑会抢同一个 `tsconfig.tsbuildinfo`）。
- 一处代理误报被核实推翻：hitokoto/answerbook 的 `Retry-After: 16` 是**实测样例里本窗口的剩余秒数**，不是「窗口 16 秒」的规格声明；窗口长度是 `lib/server/protection.ts:130` 的 60 秒，与共享文案一致。没有按它的建议改数字，而是把这条注释补成 `…（16 是这一窗口剩下的秒数，窗口本身 60 秒）`——这是本轮唯一一次有意改动内容，oracle 里对应 4 行差异。

顺带清掉一个「逐字节相等」保下来的死节点：`hitokoto.ts` 的参数节原本往 `lead` 位置传了一个 `para(...text(''))`（空段落），基线里就有，oracle 自然原样放行——它在 `DocBody.tsx:67` 的 `gap-4` 里会实打实撑出 16px 空白。已改为 `paramsSection()`。**oracle 只保证我没抄错，不保证原文有价值**，改完仍需通读一遍渲染结果。同一轮拿语料核样例时又发现 `hitokoto` 的 200 样例漂了三处（详见 §2 第一条 P1），一并改正并补了 `tests/doc-samples.test.ts`——逐字节相等保住了格式，保不住事实。

剩余没做的：`overview` 段落与各接口自己的 500/503 行、混合 `text`/`code` 片段数组、`requestPanes` 的三语样例正文——这些是真正的「每个接口不一样」，不该上收。

## 1.9 第五轮：把分析报告逐条落账

`docs/CODE-ANALYSIS-REPORT.md` 是并行跑出来的分析，它的 D1–D12 / O1–O14 有相当一部分在本仓库后续改动里已经处置完了，留着旧结论比没有结论更坏。这一轮把每一条拿去对代码与用例，报告里就地标注状态，度量表数字全部换成实测（234 文件 / 23,132 行 / 118 用例 / 文档区 3,323 行）。

- **复核方式**：不采信报告的说法，逐条读它引用的 `文件:行` 并跑对应用例。结果分三类——已修（D1 的 `7d` 换算早就是 `7 * 24 * 3600`，且 `tests/metrics.test.ts:140` 用双探针钉住不许回退；D2/D3 的改密空操作与明文口令由 `store/users.ts` 的 scrypt + `timingSafeEqual` 结清）、已缓解（D5 的 `sampledCapped` 进了 `DashboardView.tsx:135` 的文案）、仍开放（D8 三处路径拷贝（第十轮收掉，见 §1.14）、O10–O12 的测试尾巴）。
- **安全种子默认值收紧**（原 D7）：`store/security.ts` 的 `ipWhitelist` 从 `['10.0.0.0/8', '172.16.0.0/12']` 改为 `[]`，`ipBlacklist` 从两个 RFC 5737 文档地址改为 `[]`（摆着演示 IP 等于控制台显示「2 条黑名单」却谁也没挡住），`SECURITY_SEED_VERSION` bump 到 `2026-10-10.narrow-defaults`。**为什么不是留一个 `127.0.0.1`**：`handler.ts:123` 的豁免同时关掉频控与访问规则，而 `trace.ts:73` 在缺转发头时把每个请求都算成 `127.0.0.1`，豁免本机就等于在没配代理头的部署上把限流整体关掉。
- **白名单那行文案是「UI 说了但后端不做」的又一例**：`SecurityView.tsx:143` 原本写「控制台仅允许以下来源访问，留空表示不限制」，而这份白名单跟能不能进控制台毫无关系，它只豁免频控与规则；旁边的 callout 还建议「以网段形式授权」，正对着刚清掉的那个风险。两处都改成按 `enforceIpLists` 的实际语义描述。
- **文档样例的事实核对**：`hitokoto` 的 200 样例与语料差三处（半角逗号替全角、句末「。」丢了、`source` 从「蝶恋花·阅尽天涯离别苦」截成「蝶恋花」），按语料原文改正，并新增 `tests/doc-samples.test.ts` 要求语料类两篇的样例能在 JSON 语料里逐字段命中。§1.8 的 oracle 保证我没抄错格式，这条保证样例还是事实——两者不是一回事。
- **D6 只动文档不动代码**：README 的频控一节新增一条「反向代理必须转发 `x-forwarded-for` / `x-real-ip` / `cf-connecting-ip` 之一」。没有加报告建议的逐请求 `logger.warn`：Route Handler 拿不到 socket，兜底本身就是「不知道」，而本地开发必然刷屏——日志噪声的实际代价高于这条提示。

## 1.10 第六轮：契约面、配置层与「谁在读它」

这一轮的输入是我自己那份优缺点清单（A–C 全部复核过 `文件:行` 才动手），做的都是同一类事：**契约比实现宽的地方收到实现那么大**。

- **`RequestError` 收了六个没人读的成员**（`isForbidden` / `isValidation` / `isNetwork` / `isServerError` / `firstIssue()` / `displayMessage`，`lib/api/error.ts` 72 → 48 行），同时把两个原本空转的字段接上：`issues` 由 `LoginForm.tsx`  typed 读取（那里原先是一个结构 cast，字段名写错编译器不会响）；`traceId` 进错误 toast（`useRequest.ts:75`，格式「… · 编号 mv2c7ba2-…」）。文档一直叫调用方「带 requestId 来报障」，控制台里此前没有任何地方显示过它。
- **权限面收缩**：`usePermission.ts` 从 51 行缩到 9 行，只留 `useCan`（4 个调用点，全在问 `xxx:write`），删掉 `canAny` / `canAll` / `labelOf` / `isRole` / `isReady` / `role` / `permissions` 七个零消费返回值 —— 判定本身在 `AuthProvider.can` 里已经有一份，视图层不需要第二份。连带删掉 `useAuth` 里只为 `isReady` 存在的 `hydrated` 状态管线、以及只被 `labelOf` 引用的 `PERMISSION_LABELS`（`constants/auth.ts` −11 行）。`AuthContextValue` 现在只剩 `{ can, signIn, signOut }`：`user`/`status`/`expiresAt`/`reload`/`refresh`/`patchUser` 全仓没有读方，留在 context 里就是六个假装有人用的字段（删完 lint 立刻指出 `status` 是只写状态，于是整条状态机一起走）。
- **`guardPage` 的 `permission` / `anyPermission` / `roles` 三个参数与 `denied` 分支删掉**（`lib/server/guards.ts` 43 → 29 行）：7 个 admin page 一次 `guardPage` 都没调，唯一的调用在 `app/admin/layout.tsx:17` 且不带参数，所以那条分支没有可达路径；真正的权限门禁在各 API 路由的 `permission` 声明里。理由写在函数注释里，免得下一个人再补一份没人走的门禁。
- **store 三胞胎合成一个外壳**：`settings/security/rules` 各自那份「globalThis 挂载 + 种子版本比较 + redis 水合 + 写镜像」抽到 `lib/server/store/config.ts` 的 `createKvBackedConfig`，三处 288 行 → 223 行 + 90 行共享实现。**顺带修掉一个真隐患**：水合原先写的是 `SETTINGS = parsed`（三处同构），那是整体换引用，跟这个仓库赖以成立的约定——「写路径必须原地 `Object.assign`，否则其它 route chunk 看不见」——正好相反；一旦配 redis，只有执行水合的那个 chunk 会读到外部值。现在水合走 `replaceInPlace`（对象清键再 assign、数组 `length = 0` + `push`），引用不换。`tests/config-store.test.ts` 用 5 个用例钉住：引用不换、外部数据里缺的键要删干净、同版本第二次拿到同一对象（模拟两个 chunk）、bump 版本会重播种子、memory 后端下 `mirror()` 空操作。规则的 `hitsToday` 在水合时归零并清记账，这样「计数各实例自己累计」这句注释才成立。
- **乐观写只剩一条路**：`SecurityView.tsx`（431 → 410 行）里四个列表增删 handler 原本各自手写「快照 → 落本地 → await → catch 回滚 → toast」，与同文件 `commit()` 逐行同构；现在 `commit(next, write, messages)` 是唯一入口，`updateField` 也走它。`useOptimisticToggle` 不再丢弃 `persist()` 的返回值（`persist` 的类型收紧成 `Promise<TRow>`），成功后用服务端那一行覆盖本地行——`updatedAt`、`hitsToday` 这类派生值从此以响应为准，不再停在本地 patch 的形状上。
- **统计口径按作用域标出来**：`StatusBars` 数的是当前页却叫「状态码分布」，改成「本页状态码分布」，并在文件头写清它和上方按筛选算的汇总卡不是一个口径；`RulesView` 的描述行把 `activeCount` 与 `totalHits` 一起归到「本页 N 条」下；`LogsView` 四个汇总卡此前在请求失败或还没回来时渲染 `?? 0`，配上「当前筛选 · 记录数」的标签，会被读成「一条都没有」，现在未知显示「—」——当时的事实是不知道，不是零。
- **表格的可访问性补上**：`DataTable` 的 `<th>` 全部加 `scope="col"`（此前全仓 `scope=` 零命中），可排序列加 `aria-sort`；整行可点的地方加 `tabIndex` + Enter/空格激活（焦点环由 `globals.css:126` 的 `:focus-visible` 统一给，不往 `<tr>` 挂 `role`，表格语义优先）。三个筛选工具条的原生 `<select>` 补 `aria-label`（同屏两三个裸下拉，读屏只能念出「组合框」）。
- **抽屉不再持有一行的副本**：`ApisView` / `RulesView` 原先 `useState<ManagedApi | null>` 存的是打开那一刻的对象，列表刷新或行内开关切换后抽屉还停在旧形状（`onRefresh` 只刷列表）。现在状态只存 `drawerId`，那一行用 `useMemo` 从 `data.items` 里取——单一真相，抽屉跟着列表的新数据走。删除入口只在表格行上（抽屉里没有删除按钮），所以「删掉正在看的那行导致抽屉变空」这条路径不可达；删除确认框那边仍然存副本，那是对的：它要在行消失之后继续显示名字。
- **`offline` 这个到不了的取值删掉**：接口状态此前在 `types/domain.ts`、`lib/zod/admin.schema.ts`（两处 enum）和 `ApisView` 的筛选项里都有「停用」，但后台只有一个「上线 / 转入维护」开关，创建默认 `online`，PATCH 写不出 `offline` —— 那个筛选项永远返回空列表。类型与 schema 一起收窄，编译器会指出所有残留分支。
- **门禁从「靠人记得」变成一条命令 + CI**：新增 `npm run verify`（typecheck → lint → test，**刻意不含 build**，因为 dev server 与 build 共用 `.next`，见「开发注意事项」），`.github/workflows/ci.yml` 跑 verify 与生产构建两步，构建步骤带一个仅供构建的占位密钥。远端在 GitHub 上，此前没有任何 workflow，而 README 与本报告都在拿「CI 也绿」讲原则。

**我上一条结论自己撤回的**：我曾报告「`.env.example` 少三个键」。实际 `COOKIE_DOMAIN` / `COOKIE_SECURE` / `REDIS_URL` 都在文件里，是**注释行**（可选键，要时才解注释），我的比较脚本只匹配未注释的 `KEY=`。不修文件内容，但补了 `tests/env-example.test.ts`：把 schema 的键名清单（`env/index.ts` 新增导出 `ENV_KEYS`）与示例文件双向比对，注释行算存在——以后加环境变量忘写示例、或示例里留着 schema 已删的键，都会红。这轮再次说明：**grep 式扫描的结论必须以脚本口径复核**，我这次错在自己的匹配式。

**刻意不做的三件**（都想过，收益不抵代价）：
1. 页面级权限门：单角色且该角色握有全部权限，加了不可达；服务端 `permission` 声明是真正的门禁。
2. 工具条下拉的组件化：三处尺寸各不相同（`h-[36px]` / `h-8` / `h-7`）、选项表也各自一份，抽 `ToolbarSelect` 只是把三个字符串搬进一个 props，按「三行相似好过一次过早抽象」留着。
3. 合并文档页那两个 IntersectionObserver：`DocsRail` 与 `DocsTocStrip` 各观察同一批 8 个 section，其中一个永远被 CSS 隐藏。共享一份 observer 要把两个组件提到一个客户端边界里，DOM 位置不同、要靠 context 或 portal 绕——为省一个监听器引入一层抽象不划算，代价实测也不可见。

## 1.11 第七轮：四个语料接口与模板对账

用户给的四个数据源（`public/assets/json/poems.json`、`ChengYu.json`、`soul.json`、`kfc.json`）落成四个公开接口：古诗词 / 成语大全 / 毒鸡汤 / 疯狂星期四文案。这一轮没有再砍什么，价值在于**用真实需求把模板（`docs/API-TEMPLATE.md`）跑了一遍，跑到两处对不上**。

- **接口本身**：四个都走同一条链路（types → `lib/server/*` → `public.schema.ts` → route → endpoints → catalog → docs），新代码里路径一律取 `API.publicApi.<id>`，没有新增第四份字面量。语料规模与形状全部实测：诗词 300 首（唐 150 / 宋 150，`dynasty` 只收 `tang` / `song`）、成语 50,373 条（`chars` 实测 4–8，4 字占 47,246）、毒鸡汤 2,020 条（响应只回 `id` / `content`，时间戳不出去）、KFC 424 条（内容含多行，`\n` 原样保留）。
- **成语的 `limit` 是刻意的例外**：默认 1、上限 100，没有全量语义——5 万条约 1.2 MB，全量不是给浏览器用的形状。README 的 `limit` 口径句补上了这处例外（另一处是素材类「随机取 N 而不是前 N」）。随机性由新增的 `utils/random.ts` 提供：`sampleUnique` 用部分 Fisher-Yates + 稀疏 Map 消重，一次抽 N 条不重复。
- **模板对账，改出两处**：① API-TEMPLATE §1/§5 此前写「query 默认 `.strict()`、多余参数会被拒绝」，实测相反——query 是普通 `z.object`，多传 `?foo=1` 照常 200，`.strict()` 只用在写接口的体上；② §4 路由骨架还在教 `route: '/api/v1/<name>'` 字面量，新四篇的实际写法是 `API.publicApi.<name>`，骨架示例已改。这两处正是「仓库里没有第二个消费方会亲手撞上，所以一直没人发现」的那类文案。
- **文档预算重测**：骨架仍 1,482 字符（十四篇同一份）；各篇扣掉骨架后在 911（`hitokoto`）–2,408（`wallpaper`）之间，十个参数接口落在 1,418–1,796，新增的免参 `soulsoup`（1,040）与 `kfc`（1,012）把下限往上抬了一格。§2.2 的数字已换成这组实测。
- **新用例钉住语料事实**：`tests/corpus-facts.test.ts` 把四份语料的规模、朝代分布、填空题不变量（`answer` 必在 `options` 里、`index` 指向的字就是 `answer`）写成断言；`tests/doc-samples.test.ts` 从两篇扩到六篇，语料类文档的 200 样例必须能在 JSON 语料里逐字段命中（新增 `tests/random.test.ts` 5 个用例）。
- **验证与一个坑**：`npm run verify` 145 项全绿；`npm run build` 47 条路由、静态页仍是 6 页；四个接口 curl 实测（200 / 422 / 429 / 405 全对，`x-trace-id` 等于 `meta.requestId`）。验收文档页时先踩了一下：生产服务吃的是构建产物，改了 `registry.ts` 不重新 build，`/docs/poetry` 会安静地给骨架页——「200 就算通过」是错的，要拿页面里的唯一取值（如样例 `requestId`）对得上才算。重构建后四页均实测通过；当时广场四张卡片还落着 `DemoFallback`（渲染出 4 个「演示暂不可用」），随后补齐了四个 demo 并浏览器实测；卡片的交互形态在第八轮又按使用反馈改过一轮（见 §1.12）。

## 1.12 第八轮：三条路由改名，四张卡片按使用反馈改交互

用户给了四条使用反馈，全部落地：三条路由换英文名（`poem` → `poetry`、`chengyu` → `idioms`、`dujitang` → `soulsoup`）、诗卡先亮整句再让人填字自相矛盾、成语 / 毒鸡汤 / kfc 三张卡的统计脚注没有信息量、kfc 的换行在页面上没有渲染出来。

- **改名动的是一整条登记链，不是三个目录**：这个仓库里 `id = 路由尾段 = /docs/<slug> = DemoKind`，所以一次改名同时改了：路由目录、`lib/server/*` 数据源文件、`lib/zod/public.schema.ts` 的 schema 符号（`poetryQuerySchema`、`IDIOMS_DEFAULT_LIMIT`）、`lib/api/*`（endpoints 键、admin-api 的 fetcher 名、index 再导出）、`constants/api-catalog.ts` 的 id/path/demo、`components/docs/**`（模块文件名、导出名、`registry.ts`、`authored-slugs.ts`）、`types/domain.ts` 的 `DemoKind` 与 demo 组件文件名/导出名。数据概念名不跟着换：`Poem`、`SoulLine`、语料名 `ChengYu.json` 说的是数据形状，不是路由；`ChengYuList` 是例外——它是对外露出的接口类型名，改叫 `IdiomList`。旧的拼音词留在 `kw` 里，搜索仍能命中。
- **两处种子版本跟着 bump，都是「不 bump 也能跑、直到有人读到旧值」那种坑**：`catalog.ts` 的 `SEED_VERSION`（`seedSignature = 版本 | API_CATALOG 的 id 列表`，id 一变换、内存里的后台配置就整体重播种）；`settings.ts` 的 `SETTINGS_SEED_VERSION`（广场卡片布局的默认数组从 `API_CATALOG` 派生、每项按 id 存跨度，不 bump 的话已初始化的实例一直拿着 `poem` 这类不存在的 id——广场那边 `cardSpan()` 找不到就缩成 1×1，设置页则显示幽灵行）。
- **诗卡：不再先亮整句**。原先卡片先把完整名句渲染出来、再在下面出选项——要填的字就摆在句子里，题目自己泄露答案。现在 prompt 直接呈现缺字句（当时用「？」占位，第九轮换成了空线，见 §1.13），选项点选即判定：选错只把该选项灰掉划线（还能再试），选对开格换绿，停顿一拍（`SOLVED_HOLD_MS = 1000`）自动取下一首并复位。换首用 `round` 状态与点击驱动的 `seed` 共用同一个取数 effect；effect 开取前先复位 `solved` / `wrong`，这样停留在「答对等待」期间的点击会先取消挂起的换首定时器，不会一次点击取回两首诗。
- **三张卡删统计脚注，成语卡顺带去掉了没处显示的 `chars` 轮换**：脚注原样是「不限字数 / 4 字成语 · 共 50,373 条」「第 1234 条 · 共 2,020 条」「本条 742 字」——都是语料规模与序号，对读卡片的人没有信息量。`chars` 轮换（`seed % 6` 切换 4–8 字档）一删就说得通：脚注是它唯一的可见提示，留着它就变成随机抽到 5–8 字的罕见成语而无人知道为什么；fetch 只传 `limit`。CSS 同步删 `.plaza-demo-chengyu-note`、`.plaza-demo-text-note` 与 `--soul` 的 note 对齐规则，三份 demo 组件从 208 行收到 196 行。
- **kfc 换行是 `white-space` 的默认行为，不是数据问题**：文案自带 `\n`，HTML 默认把连续空白折叠掉，渲染出来连成一片。`.plaza-demo-text-body` 加 `white-space: pre-line`（保留换行、不保留首行缩进），浏览器里实测带 12 个 `\n` 的那条渲染出 13 个行盒。
- **验证**：`npm run verify` 145 项全绿。生产构建 47 条路由、静态预渲染仍是 6 页、共享 JS 103 kB、`/` 135、`/plaza` 144、`/docs` 129、`/docs/[slug]` 132（与上轮一致）。构建时用户的 dev server 正在 3000 端口跑（dev 与 build 共用 `.next`），所以这轮的构建产物放到独立目录里完成复测，跑完即删，没碰 dev server。生产 curl：`/api/v1/{poetry,idioms,soulsoup}` 200（`poetry?dynasty=song` 回辛弃疾）、`/api/v1/{poem,chengyu,dujitang}` 404；`x-trace-id` 与 `meta.requestId` 相等；`poetry?dynasty=nope` 回 422、`data:null`、无 `success`（失败信封同形）。四张文档页的生产 HTML 里都能对上各自样例的 `requestId`。浏览器（生产 `/plaza`）：诗卡「溪头？剥莲蓬」错选「躺」→ `is-wrong` + disabled，选对「卧」开格、约 1 秒后自动换到《卜算子·咏梅》且选项全部复位；成语 9 张词签、毒鸡汤与 kfc 卡无脚注、kfc 多行渲染；控制台无 #418（仅匿名 401 探针）。
- **旧 slug 在文档页不是硬 404，这是既有行为**：`/docs/poem` 返回 200 + 「文档不存在」页面——动态页流式渲染下 `notFound()` 到达时响应头已发出，状态码改不了；`generateMetadata` 用 `robots: noindex` 兜收录（`app/docs/[slug]/page.tsx:33` 的注释写的就是这件事）。dev 与生产行为一致，跟本轮改名无关，不用再追。

## 1.13 第九轮：诗卡补上「两句 + 诗人」，毒鸡汤并入一言排版

用户两条反馈：毒鸡汤卡跟一言卡统一样式；诗卡既然要填字，就得显示两句、只挖一个字，并且除诗句外要写出诗人。

- **两句取「含题干的那一整行」，不是 `quote`**：这一改把语料的一处结构逼了出来——`quote` 是本诗最有名的一联，300 首里有 **25 首它跟题干不在同一联**（《静夜思》题干是「疑是地上霜」，quote 却是「举头望明月，低头思故乡。」）。改成在 `lines` 里找包含题干的那一行，300/300 命中，空位下标按 `line.indexOf(prompt) + blank.index` 映射。这条不变量由 `tests/corpus-facts.test.ts` 新增用例钉住，顺带钉住「行内不得出现非 BMP 字符」：卡片用 `indexOf` + `slice` 定位空位，一个代理对就会让它整体错位。API 一个字段都没动，`lines` 本来就在响应里。
- **空位从「？」换成空线**：实测 300 首里 **88 首的空位紧贴标点**，摆着「？」就会渲染成「风多响易？。」这种双标点。改成只留一条 1.1em 的下划线空格，答对时把绿字填进这条线。
- **诗人署名**：卡头只留题目，两句下面加一行「—— 元稹 · 唐」，与一言卡的「— 作者 · 出处」同形制（10.5px 灰字）。
- **毒鸡汤并入一言排版**：`SoulsoupDemo` 改渲染 `.plaza-demo-quote`（大引号 + 16.5px 斜体衬线 + 居中），玻璃面板去掉。于是 `.plaza-demo-text--soul`、`.plaza-demo-text--kfc` 两条变体规则失去消费方，一并删掉，面板样式收回 `.plaza-demo-text-body` 一条规则；两卡之间只剩「取一条随机文本」是同构的，`TextDeck` 组件换成一个局部 hook `useRandomLine`，排版各写各的——比在共享组件里塞 variant 分支直白。
- **验证**：`npm run verify` 146 项全绿（新增那条语料用例）。生产构建 47 条路由、静态页 6 页、共享 JS 103 kB、`/plaza` 144、`/docs` 129、`/docs/[slug]` 132，与前两轮一致。浏览器（生产 `/plaza`）：诗卡《咏柳》「不知细叶谁＿出，二月春风似剪刀。」错选「剪」→ `is-wrong` + disabled、选对「裁」→ 开格、约 1 秒自动换到《行宫》「白头宫女在，坐说玄宗。」+「—— 元稹 · 唐」且选项复位；三小句的行诗（《渔家傲·秋思》「四面边声连角起，千嶂里，长烟落日孤城＿。」）连排同样正常。毒鸡汤卡与一言卡的 computed style 逐项一致（16.5px / italic / 居中 + 引号、无面板），kfc 面板 11.5px / `pre-line` / justify 未变；控制台无 #418。行数：应用源码 23,086 → 23,098（三份 demo 组件 196 → 208），测试 +11 行。

## 1.14 第十轮：零消费代码、从不传的参数，与路径字面量的第三份拷贝

这轮把「谁在读它」重新问了一遍（grep 列调用点 + `tsc` 双向确认），清掉三类东西：只有测试在用的实现、十个从没人传的参数、以及 §2 挂了两轮的第三份路径拷贝。

- **限流窗口只剩一种实现**：`utils/rate-window.ts` 的 `createWindowStore`（纯内存 Map + 容量清扫）生产零消费方——`lib/server/protection.ts:21` 用的是 `createKvWindowStore`，内存后端早在第三轮就并进了 `KvStore`。它自己那句注释「主要用于单测」就是说破了这件事：一个只有测试在守护的实现，守的还是不再走的路径。连带删掉 `WindowStore.size()` / `reset()`（生产只调 `tryConsume`）、`Bucket`、以及只测它的 `tests/rate-window.test.ts`（62 行 / 6 用例）。固定窗口语义仍由 `tests/kv.test.ts` 的两条用例守着（超限拒绝、窗口滚动、两实例共享同一份计数），端到端限流由 `tests/enforcement.test.ts` 守。
- **`isFailure` 整条链删除**：`types/api.ts` 定义、`lib/server/response.ts` 导入后又 `export { isFailure }` 转发出去，全仓零调用点。`isSuccess` 留着——`lib/api/http.ts` 有两个真消费方。
- **三个 barrel 的死转发**：`lib/server/index.ts` 的 `validate` / `guards` / `stats` / `logger` / `trace`、`components/ui/index.ts` 的 `Brand` / `button-variants` / `Tabs` / `Toast`、`lib/api/index.ts` 的三个类型再导出与整个 auth-api 块。判据是「删掉之后 `tsc` 仍零错误」，不是 grep 数命中。留下的仍是真在用的：`@/lib/server` 35 个文件走它、`@/components/ui` 20 个、`@/types` 78 个。
- **十个从不传的参数**：`preflight(routePattern)`（16 个调用点全是 `preflight()`）、`routeCallStats(sinceMs)`（4 个调用点全不带）、`useNow(intervalMs)`、`useCopyToClipboard(resetMs)`、`useScrollVisible(bottomGapPx)`、`useScrollSpy(rootMargin)`、`formatNumber(fractionDigits)`、`formatPercent(fromRatio)`（那条 `value * 100` 分支不可达）、`useOptimisticToggle` 的 `failureMessage`（两个调用点都吃默认文案）、`fetchIdioms(chars)`（唯一调用点只传 limit）。同形制的 `recentCalls(sinceMs, untilMs)` **没动**——`lib/server/metrics.ts:159,162` 真的在传，这就是为什么这条必须逐个列调用点而不是按名字猜。
- **路径字面量收敛（§2 的 P1，本轮销账）**：`/api/v1/<id>` 原先有三份——`lib/api/endpoints.ts`、`constants/api-catalog.ts` 的 14 个 `path`、14 篇文档模块各自的 `const path`。后两处改成引用 `API.publicApi.<id>`，字面量只住在 endpoints 一处。`tests/catalog-sync.test.ts` 那条 `path === '/api/v1/' + id` 留着，但角色变了：从「兜住三处漂移」变成「验证 endpoints 自己没写错」。报告 D8 的「登记仪式」成本因此少一项。
- **两份 id 清单合一**：`SEALED_API_IDS` 与 `IMPLEMENTED_API_IDS` 是同一个十四项列表的两份写法（前者注释写的就是「带了服务端实现的那批 id」）。合成一份 `IMPLEMENTED_API_IDS`，类型 `SealedApiId` 改名 `ImplementedApiId`（7 处，全在代码里，文档从没引用过「sealed」）。
- **`changePassword` 客户端 wrapper 删掉，服务端接口留着**：控制台没有改密表单，这个 fetcher 零调用点。`POST /api/v1/auth/password` 是真实现（校验旧口令、重算哈希），`tests/users-store.test.ts` 与 `tests/auth-schema.test.ts` 都在守它，报告 D2 记的就是它——缺的是 UI，不是接口，所以删前者不删后者。
- **验证**：`npm run verify` 140 项全绿（146 减去被删的 6 条死码用例）。`npm run build` 仍是 47 条路由、静态预渲染 6 页，首屏 JS 普遍下移：`/` 135→134、`/plaza` 144→143、`/docs` 129→127、`/docs/[slug]` 132→130、`/login` 149→148，共享 chunk 103 kB 不变。生产实测：14 个公开接口与 `/api/health` 全 200、`poetry?dynasty=nope` 422、`x-trace-id` 等于 `meta.requestId`；八张文档页（含改过 `path` 写法的四篇语料类）路径照常渲染，`/docs/poetry` 的样例 `requestId` 仍对得上；广场 14 张卡 0 个「演示暂不可用」，诗卡两句 + 署名、毒鸡汤引号排版、成语 9 张词签、kfc 多行均未受影响；控制台只有匿名 401 探针。行数：总 25,031 → **24,897**，应用源码 23,098 → **23,026**，测试 1,933 → 1,871，文件 255 → 254。

## 1.15 第十一轮：请求管线选项面、demo 取数骨架，与文档区的同形块

三路扫描（`lib`+`utils`+`constants`+`types` 的导出面、`components` 的 props 与重复、`components/docs` 的同形块）之后清下来的东西。判据沿用前几轮：调用点全列一遍，再让 `tsc` 复核。

- **路由配置面砍掉五个字段**：`WithApiOptions` 的 `anyPermission` / `roles` / `csrf` / `extra` / `headers` 全仓零赋值（43 个 `defineRoute` 调用点 + 两份测试逐个列过），但 `handler.ts` 里带着对应的分支与管线。删掉两条不可达的 403 分支、`withExtraHeaders()`、`handleFailure` 的 headers 参数，以及为 `extra` 而生的整条 `TExtra` 泛型管线（`ApiContext` / `ApiHandler` / `WithApiOptions` / `withApiHandler` / `RouteContext` / `RouteConfig` / `defineRoute` 各少一个类型参数）。随之 `hasAnyPermission` 零消费，一并删。**留下的**：`track`（`/api/health` 在用）、`rateLimitPerMin`（登录路由与 6 条限流用例在用）、`permission`（22 处）。
- **demo 的取数骨架单源**：十四个 demo 里有 11 处逐字同构的「seed 变了就重取 + 丢弃过期响应 + 失败置位」，最典型的是四个榜单卡各写 20 行、只差 fetcher 名字。收成 `components/plaza/demos/types.tsx` 里的 `useDemoFetch(key, load)`：`load` 走 ref（每帧都是新闭包，进依赖表会无限重发），`key` 是各卡真正会变的量——榜单卡是 `seed`，素材卡是 `` `${seed}:${type}` ``，诗卡是 `` `${seed}:${round}` ``（答对自动换首的 round 与点击的 seed 合成一个键）。三份文本/词签/诗卡组件从 208 行降到 148 行。**没有**顺手统一榜单卡的版式：四张榜的行结构看着像，实际每行的字段与单位不同（票房折万、时长折分秒、播放指数带千分位），共享要两个 render prop，按 §2 的判断留着。
- **两处字面量单源**：`clock(iso)` 三个榜单卡逐字相同（`utils/format.ts` 的 `formatClock` 带秒和时区，不是同一个东西），提到共享模块；`SHOW_ROWS = 6` 四份改成 `DEMO_ROWS` 一份。
- **文档区两处同形块**（§1.8 那轮上收骨架时留下的尾巴）：八个接口的「缓存实现 = 进程内存 / 单进程内存表」整行相同 → `CACHE_IMPL_ROW`；七篇的 500 建议那句逐字相同 → `SERVER_ERROR_SUGGESTION`。另外三篇（诗词 / 成语 / 毒鸡汤 / kfc 那一组）的缓存行说法各不相同，**没有**强行合并。十四篇净 −28 行，`commonSections.ts` +14。
- **13 个只在自己文件内使用的 `export` 去掉关键字**（`RequestErrorCode` / `RequestErrorInit` / `CatalogPatch` / `CorpusLoader` / `CorpusOptions` / `DashboardTotals` / `KvBackedConfigOptions` / `KvBackedConfig` / `PoemBlank` / `PublicApiMeta` / `errorsOverview` / `envelopeResponseRows` / `noParamsTable`），外加删掉孤儿类型 `ChangePasswordInput`（上一轮删客户端 wrapper 之后它零引用）。`tsc` 零错误就是「没人跨模块引用」的证明。
- **六个从不传的 props 与一个单消费组件**：`DataTable.className`、`Pagination.className`、`Badge.className`、`MethodBadge.className`、`Panel.as`、`Segmented.className`；`Kicker` 只有一个调用点且两个 props 都没传，直接内联成 `<p className="kicker kicker--line">`；`RulesView` 的 `skeletonRows={6}` 与组件默认值重复。
- **一处文档自相矛盾修好**：`hotsearch` 的响应头示例写 `traceId: 'muzg2vvb-…'`，而它两个响应窗里的 `requestId` 分别是 `muzg3no6-…` 与 `muzg2w9n-…`——`commonSections.ts` 里两处文案都承诺「与 requestId 同值」。逐篇脚本核过，**14 篇里只有它漂**，其余 13 篇的 traceId 都能在本文档的窗里找到。改成取成功窗那个值。
- **两处被 `tsc` 抓回来的误判**（记下来免得下次再犯）：`Badge` 的 `mono` 用 JSX 布尔属性写法（`<Badge mono>`，不带 `=`），按 `name=` 抓属性的脚本看不见；`useClickOutside` 的第二个实参跨行传（`SiteHeader.tsx:22`），按单行 grep 判成了零传参。两个都是我先删、`tsc` 报错、再恢复——**结论：这类删除必须让 `tsc` 过一遍才算证完，grep 只是用来找候选的。**
- **验证**：`npm run verify` 140 项全绿；`npm run build` 47 条路由 / 静态页 6 个，首屏 JS 与上轮持平（`/` 134、`/plaza` 143、`/docs` 127、`/docs/[slug]` 130、`/login` 148，共享 103 kB）。生产实测：15 个公开与广场接口全 200、未登录的控制台三个端点（`apis` / `dashboard` / `logs`）全 401（鉴权分支没被这次收缩碰坏）、`idioms?limit=999` 422；`/docs/avatar` 仍渲染「单进程内存表」、`/docs/poetry` 渲染共享后的 500 建议句、`/docs/hotsearch` 的 traceId 与窗内 `requestId` 一致。浏览器逐卡查 DOM：11 张走新 hook 的卡全部拿到真实内容（榜单抬头时间、素材卡尺寸标注、成语 9 签、毒鸡汤引号排版、诗卡《浪淘沙令》「流水落花春＿也」→ 选错灰、选对开格、约 1 秒换《少年游》并复位），0 个「演示暂不可用」，控制台只有匿名 401 探针。行数：总 24,897 → **24,612**（−285），应用源码 23,026 → **22,741**，文档区 4,300 → 4,286。

## 1.16 第十二轮：只写不读的字段、零调用成员，与两处已经漂了的重复

两路扫描（组件 props / 常量成员 / hooks 与 zod 面）加上我自己复核的负结果。这轮删得不算多，但把两类「看着像死码、其实各有说法」的东西分清了。

- **调用记录里两个只写不读的字节字段**：`requestBytes` / `responseBytes` 从 handler 的 `Number(headers.get('content-length'))` 一路写进环形缓冲，metrics、日志页、报表、结构化日志没有任何一处读它们。整条链删掉（`RequestContext` 字段、两处 handler 写入、`ApiCallRecord` 两个字段、`recordApiCall` 的 overrides 形参）。**同一个位置的 `errorCode` 差点被我一起删掉**——按文件 grep 它也只有 handler 与一处测试命中，但读进 `stats.ts` 函数体才发现 `logger.info({ meta: { errorCode } })` 是真消费方。教训：判断「只存不用」要读到实现体，不能只看文件名命中。
- **Toast 面收缩**：`show` / `warning` / `info` / `clear` 四个导出成员零调用点（界面只用 `success` / `error`，28 处），`show` 退回成模块内函数；`ToastItem.createdAt` 是只写字段；`ToastTone` 因此从四档收到两档，`ui/Toast.tsx` 的 `TONE_STYLE` 同步少两项。
- **零传参的选项与「和默认值一样」的传参**：`signOut({ redirectTo })`（唯一调用点 `signOut()`，固定回登录页，`Route` 导入随之删）、`SparklineProps.color`、`BarListProps.formatValue`、`http` 的 `retry` 选项（重试策略直接写在实现里：GET 一次、写请求不重试）、`AreaChart` 调用点传的 `height={258}` 就是它的默认值、`useScrolled(40)` / `useDebouncedValue(kw, 180)` 同理、`cardSpan` 的 `{cols:1,rows:1}` 默认（两个调用点都传 `PLAZA_CARD_DEFAULT_SPAN`，留着默认值只会让人以为 1 列是常态）。`BarList` 的兜底格式化原本自己写 `toLocaleString('en-US')`，改成用 `utils/format` 的 `formatNumber`。
- **修掉一处真实漂移：状态族配色有两张表，而且已经不一样了**。仪表盘 `FAMILY_COLOR` 的 2xx 是 `#365b49`、4xx 是 `#c2a36f`，日志页 `StatusBars` 写的是 `#2f7a4f` 与 `#c2703f`——而仪表盘那句注释「按族取色，避免同一族在不同区间换颜色」说的正是这件事。合并成 `constants/app.ts` 的 `STATUS_FAMILY_COLORS`（含 429 一档），浏览器实测两处现在都是 `rgb(54, 91, 73)` / `rgb(194, 163, 111)`。
- **三处「第二遍手写」改成派生**：仪表盘的时间 chips 从 `rangeSchema.options` 生成（`lib/zod/common.ts` 里那句「取值须与仪表盘的时间 chips 一致」是 §1.4 已经删过一次的祈祷注释，一并删）；`ApisView` 的分类筛选项从 `API_CATEGORIES` 生成（原先手写顺序已与新建表单不一致）；`app/admin/page.tsx` 的 `redirect('/admin/dashboard')` 改用 `ROUTES.adminDashboard`。`constants/app.ts` 的 `MAIN_NAV` / `FOOTER_LINKS` 各删一个没人设也没人读的 `external?: boolean`。
- **README 一处失真说法**：`/api/v1/plaza` 写着「供前台页面使用」，但前台广场页现在是服务端直接 `listCatalogItems()`，这个端点真正的消费方是后台「卡片布局」编辑器。已改口径（它走控制台信封 `ok()` 这点原本就写对了）。
- **三条负结果，记下来免得下轮再扫**：`app/globals.css` 89 个类名逐个复核**没有新增死类**（`.tok-*` 与 `.term` 仍是 `CodeWindow` 用模板串拼的；另外两个「零引用」是我脚本的边界误报——`plaza-demo-poetry-option` 后面紧跟 `${`）；`components/**` 侧外部零引用的导出为 **0**；测试区只有 `corpus()` 在两文件各写 4 行，按第一轮删 `tests/setup.ts` 的口径不抽公共测试工具。
- **一处交回你定，我没动**：日志接口的 `path` / `ip` / `cacheMissOnly` / `from` / `to` 五个筛选参数没有任何 UI 发送方（`LogsView` 只发 page/pageSize/sort/order/keyword/status/statusFamily/method）。它和第一轮删的 `dashboard?live` 不是一类——那个参数什么都没做，这五个有实现（`metrics.ts` 六七个分支）、有测试（`metrics.test.ts` 四条 + CIDR 口径）、有 `.refine` 的时间先后校验。删掉约 45 行，但那是砍能力。要么把筛选补进日志页，要么你说一句我再删。
- **验证**：`npm run verify` 140 项全绿；`npm run build` 47 条路由 / 静态页 6 个，首屏 JS 与上轮持平（`/` 134、`/plaza` 143、`/docs` 127、`/docs/[slug]` 130、`/login` 148，共享 103 kB）。生产实测：公开端点全 200、未登录 `/api/v1/apis` 401、`/admin` 307 到 `/login?redirect=%2Fadmin`；浏览器走完整会话（登录 → 仪表盘 → 日志 → 接口管理 12 行 → 登出回 `/login`），配色两处同源、时间 chips 与分类筛选派生后取值正确。行数：总 24,612 → **24,581**，应用源码 22,741 → **22,710**。

## 1.17 第十三轮：新增第 15 个公开接口（网易云热评）

这轮不是减负，是**加功能**：用户给了一个外部 PHP 参考实现（`E:\Program\ovooa\API\wyrp\api.php`），要求照它做网易云热评接口。记在这里是因为它动了基线，也顺手抓到一处写死的错数字。

- **接口**：`GET /api/v1/netease`，可选 `id` = 网易云**歌单** id（照参考实现的语义，不是歌曲 id）；不传则在内置的 12 个官方榜单里随机挑一个，从歌单随机抽一首歌，再返回这首歌热评里随机的一条。返回 `songId / song / artist / cover / comment / nickname / avatar / likedCount / timeLabel / playlistId / commentTotal`，**不含**参考实现里那个 `Url` 播放外链（那是 302 跳转，不是数据；用户拍板去掉）。
- **内置歌单从 5 个扩到 12 个，用取数而不是印象来选**：`music.163.com/api/toplist` 免签名给到 **63 个官方榜单**（参考实现那 5 个全在里面，都是榜）。逐个随机抽 3–4 首跑「曲目列表 → 评论接口」，入选标准是能稳定抽到带热评的歌：入选的 12 个全部 **hit 3/3 或 4/4**；刷掉民谣榜 5059661515（4 首里 2 首热评为空）、摇滚榜 5059633707 / 听歌识曲榜 6688069460 / 赏音榜 7775163417 / Billboard 榜 60198（各 3/4，同样大小池子里有更稳的可选）。新增 7 个：潜力爆款榜 5338990334、网络热歌榜 6723173524、欧美热歌榜 2809513713、网易云国风榜 5059642708、中文说唱榜 991319590、日语榜 5059644681、韩语榜 745956260。
- **顺手把「几处手写个数」收成单源**：新建 `constants/netease-playlists.ts` 存 `{ id, name }`，数据源 `pickOne(NETEASE_PLAYLISTS).id`，文档正文里的个数、`metaRows`、`facts`、参数表的榜单名全部由它派生——原先 5 个 id 手抄在 `paramsSection`，加一个歌单要改四处，与本轮抓到的「10 个公开接口」写死是同一类问题。池变大没有额外代价：曲目缓存本来就是「每歌单」一条，单次调用的上游请求数不变。
- **登记链一次走了六处**：`types/domain.ts` 的 `NeteaseComment` + `DemoKind` 加 `'netease'`、`lib/server/netease.ts`、`lib/zod/public.schema.ts`、`app/api/v1/netease/route.ts`、`endpoints`/`admin-api`/barrel、车单 + `IMPLEMENTED_API_IDS`、文档模块 + `registry` + `authored-slugs`、demo + 注册表。`catalog-sync.test.ts` 不用改就把它兜住了（新增一条路由目录必须登记，否则红）。
- **两处种子版本按第八轮的教训一起 bump**：车单 `seedSignature` 含 id 列表（自动重播），广场卡片布局要手动 bump `SETTINGS_SEED_VERSION`（否则老实例的布局里没有这张新卡，`cardSpan()` 回落 1×1）。
- **上游层加了一个同件**：`getUpstreamJson` 只会 GET，而网易的歌单详情与评论 weapi 都只认表单 POST。补 `postUpstreamForm`，与 GET 共用同一套超时、失败冷却与 JSON 收敛——没有另起一份 fetch。
- **签名整个不需要**：参考实现用 weapi 表单签名（两跳 AES + 预计算 `encSecKey`），我先照它实测确认今天仍可用，再去试官方别的读接口——`music.163.com/api/v1/resource/comments/R_SO_4_<id>` 用**普通 GET、免 cookie 免签名**返回的是同一份数据：同一首歌 `total` 479 两边一致、热评字段（`content` / `user.nickname` / `likedCount` / `timeStr`）完全相同。于是把 crypto 全删（数据源 141 → 113 行），固定密钥那对值不再进仓库，也就没有「哪天被拉黑」这条风险。顺带量到热评池的大小：热门歌 15 条、冷门歌 10 条，`limit=20` 只是上限——这条写进了文档的返回参数 callout。
- **三处与参考实现不同的处理**：① 非法 `id` 直接 422（参考实现是 `is_numeric` 不过就悄悄换成默认池，传了 id 却拿到别的歌单很难解释）；② 换曲重试**有界**三次（参考实现对空热评是无界递归）；③ 三条校验回显都是中文（`z.coerce` 默认给 `Expected number, received nan`，与站内其它参数口径不一致，用 `invalid_type_error` 改掉）。
- **实测事实（全部进文档，不写猜的数）**：热评池一次最多 15 条，48 首随机取样里 40 首给满 15、其余 1–13 条，`limit=20` 只是上限；`commentTotal` 实测 198 到 435,764（同一批里 270、724、13,598、61,845 这样的量级差都常见）；`likedCount` 12 到 86,036；评论正文 4 到 205 字；`timeLabel` 三种形态（「7天前」「09-26」「2025-04-16」）；**封面 108 次全 https（p1/p2 轮换），头像 36 次全 http**——原先文档写「封面 https 与 http 混出」是错的，取样后改口径，混合内容那条挪到头像；无效歌单 → 503「歌单 X 没有可用曲目」耗时 0.056s；曲目缓存热了以后单次 0.18–0.44s，冷曲目列表 0.33–0.85s。文档正文按 §2.2 口径量得 **1,998 字符**（骨架 1,482 已复现验证：`hitokoto` 2393 − 1482 = 911 与记录一致，`wallpaper` 2,408、参数档 1,418–1,796 也都对得上；扩池前是 1,924，多出的 74 字符是七个新榜单名与两处实测数字）。
- **顺手抓到一处用户可见的错数字**：后台维护模式那句写着「开启后 **10** 个公开接口统一返回 503」，而当时实际是 14 个——早就是错的，只是没人对着看。改成从 `API_CATALOG.length` 派生，浏览器实测现在渲染「15 个公开接口」。同类口径不再手写。
- **验证**：`npm run verify` 140 项全绿（用例数不变，登记一致性由既有用例覆盖）；`npm run build` 48 条路由（+1）、静态页仍 6 个，共享 JS 103→102 kB、`/` 134→133、`/plaza` 143→142、`/docs/[slug]` 130→129。生产实测（免签名版）：`/api/v1/netease` 三次 200、三首不同的歌三条不同评论、耗时 0.33–0.72s；`?id=3778678` 200、`?id=abc` 422、`?id=999999999999` 503、`OPTIONS` 204 带 `allow-methods: GET, OPTIONS`、`cache-control: no-store` 与文档口径一致；`/docs/netease` 200 且样例 `requestId` 在页面里出现两次（撰写页不是骨架页）、「热评池」callout 与「免 cookie、免签名」都在页面上、`/docs` 索引 15 条；广场第 15 张卡渲染真实热评与「— 昵称 · 《歌名》 · N 赞」署名，15 张卡 0 个「演示暂不可用」。
- **扩池后复测**：`npm run verify` 140 项仍全绿（用例数不变，池没有新增用例——文档的个数与榜单名由数组派生，抄错这件事已经不可能发生）；`npm run build` 48 条路由 / 静态页仍 6 个，首屏与上轮持平（共享 102 kB、`/` 133、`/plaza` 142、`/docs` 127、`/docs/[slug]` 129、`/login` 147）。生产实测：池里 12 个 id 逐个 `?id=` 全 200 且都落到指定歌单；不传 id 连抽 48 次 48 个 200、覆盖到**全部 12 个榜单**（每榜 3–6 次）、耗时 184–435 ms；`?id=abc` / `?id=-5` / `?id=1.5` 三条 422 回显不变、`?id=999999999999` 503、`OPTIONS` 204 带 `allow-methods: GET, OPTIONS`、`cache-control: no-store`。浏览器侧 `/docs/netease` 参数表出「内置 12 个官方榜单：热歌榜、飙升榜…韩语榜」一行不溢出，广场第 15 卡滚到视口后拿到真实热评（《嗜好》· 10,987 赞）。
- **基线影响**：文件 254 → 259，总行数 24,581 → **25,152**（应用源码 22,710 → **23,281**），文档区 4,286 → 4,587（十五篇 4,121 + `commonSections.ts` 466；本篇 297 → 301 行），新增 `constants/netease-playlists.ts` 19 行，demo 四份 148 → 174 行。

## 1.18 第十四轮：壁纸接 NASA 地球日像（EPIC），Epic 免费游戏卡在出口上

用户一次给了四件事：Epic 每周免费游戏、拓展壁纸、NASA 每日壁纸、再推荐几个接口。Epic 那件**做不了**（证据在下面），其余三件落在这节里。

- **壁纸加了第 4 类 `nasa`**：NASA EPIC 相机（DSCOVR 卫星，离地约 150 万公里）当天最新一帧的整颗地球。免 key、免签名。当日一张同样镜像进站内（`public/assets/wallpaper/nasa/`，与 bing 共用 `mirror()` 与 7 天清理）。随机池从三类变四类。
- **为什么不接 APOD（用户拍板之前我先量了）**：`api.nasa.gov/planetary/apod` 不带 key 直接 403（`API_KEY_MISSING`）；公共 `DEMO_KEY` 实测配额 30 次/小时，扫近 21 天就把本机打到 429（`x-ratelimit-remaining: 0`）。更要紧的是 **`date` 参数已经坏掉**：2026-10-07 至 10-11 逐日请求全返回占位数据（`title: "NASA Science"`、`url` 是站点 logo 的 png），只有不带 date 的「取最新」给真图。每日壁纸不能建在「只能取最新 + 随时 429 + 需要用户去注册 key」的上游上。EPIC 反过来：免 key、当日 13 帧全给、多次采样稳定。
- **镜像不能挡在请求里**：第一版照抄 bing 的同步下载，实测当天第一张要 2.5–13 秒（同一张 211KB 的图 8 次采样 2.5–5.1 秒，服务端那次跑到 13.8 秒仍失败），而失败结果会被 1 小时缓存钉住——整整一小时直链都是境外那条。改成：缓存只存「今天用哪一帧」，直链与尺寸每次按文件是否已落盘现算，下载挪到后台（`void mirror(...)`），并给 `mirror()` 加一张在飞表挡住并发重复下载。实测：首请求 31ms 先给上游直链（`width` / `height` 为 null），9–14 秒后镜像落盘，之后的请求都是站内直链 + 1080×1080。
- **EPIC 只有 1080×1080 一种尺寸**：`_800.jpg` 与 `api/thumbnail.jpg` 实测都 404，PNG 是 2048×2048 / 2.7MB（40 秒都取不下来），所以 `thumb` 与 `url` 是同一张。这条写进字段表与体积 callout，别让调用方以为 `thumb` 是预览图。
- **又抓到一处用户可见的错**：bing 的 `date` 原先取 `startdate`。实测此刻 cn.bing.com 首页在架的是 `OHR.BabcockSP_ZH-CN5266848536`，它的 `startdate` 是 20261010、`enddate` 才是 20261011——也就是说接口一直把当天的图报成昨天。改取 `enddate`，实测现在回 `2026-10-11`。
- **三处「同一件事写几份」收掉**：`WallpaperType`（union）、`WALLPAPER_TYPES`（zod 枚举）、`ALL_TYPES`（随机池）原先各写一份，加一类要改三处且漏改不会红。现在 zod 那份导出、随机池用 `pickOne(WALLPAPER_TYPES)`，union 靠 `satisfies` 钉住——与 avatar / emoji / images 早就采用的写法对齐。`pruneBingMirrors` → `pruneMirrors(dir)`、`BING_TTL_MS` → `UPSTREAM_TTL_MS`、`unavailable()` 加来源参数（两个上游的 503 文案不一样）。
- **README 又一句失真说法**：写着「壁纸没有 HIT / MISS 语义」，可 `resolveBing` 用的 `createBoardCache` 命中时就调 `markCacheHit()`，网易云的曲目列表缓存同理。按 `createBoardCache` 的实际使用面改成：榜单四类、素材三类、壁纸、网易云会给 HIT / MISS，纯语料六类才是 `—`。
- **文档正文**：壁纸本篇加了 nasa 之后涨到 2,888 字符，按 §2.2「先砍引导段、不砍字段行」删掉三处——`一行 GET 就够了…`、`只有一个可选参数…`、`响应体是一个 UTF-8 的 JSON 对象…字段摊开来看：`，正是模板点名禁止的三个句式（其中第三处还是模板自己举的反例）。2,408 → **2,682**，四类与两处实测口径都留下了。`answerbook`、`hitokoto` 两篇仍在传 request 引导段，记进 §2。
- **Epic 每周免费游戏：这轮没做，卡在出口**（用户同意先跳过）。证据：官方数据域 `store-site-backend-config.akamaized.net` 与 `-2` 全部 **DNS ENOTFOUND**（`akamaized.net` 在本机解析不了）；`store.epicgames.com` / `www.epicgames.com` 的 5 条路径全是 Cloudflare 403 挑战页（25KB 的 HTML，不是数据）；`store-content.ak.epicgames.com` 的 7 条历史路径统一 404 `{"error":true,"message":"Sorry can't find that!"}`；`graphql.epicgames.com` 对 GET 与 POST 都回 `Gone`；`www.epicgames.cn` 无解析、`epicgames.com.cn` 拒连。图片侧 `cdn1/cdn2.epicgames.com` 会 302 到腾讯云 COS，说明图本身国内可达，缺的只是那份「本周送什么」的 JSON。系统代理（127.0.0.1:65532）本轮是关的，走它全部拒连。**要做的前置条件**：服务器有境外出口，且起进程时带 `NODE_USE_ENV_PROXY=1` + `HTTPS_PROXY`（Node 24 的 fetch 才会认代理环境变量）——这条得写进接口文档的「外部依赖」里，否则国内直连部署会稳定 503。
- **验证**：`npm run verify` 140 项全绿（用例数不变）；`npm run build` 48 条路由 / 静态页仍 6 个，共享 JS 102 kB 不变。生产实测：四类各一次全 200，尺寸 2560×1440 / 1536×2048 / 1920×1080 / 1080×1080，全部走站内直链；冷启动三步如上；`?type=ipad` 与 `?type=BING` 422（文案含四类）、`?type=` 空值 200 走随机、POST 405、OPTIONS 204、`no-store, max-age=0`、`x-trace-id` 与 `requestId` 同值；不传 type 连抽 40 次得 pc 9 / mobile 8 / bing 13 / nasa 10，四轮合计 136 次为 pc 31 / mobile 32 / bing 41 / nasa 32（期望各 34），随机池没有偏。浏览器侧 `/docs/wallpaper` 四个响应窗（pc / bing / nasa / 422）都能切出来，nasa 窗里是实测的 `epic_1b_20261008214500` 与站内直链；广场壁纸卡仍固定取 `type=pc`，渲染 640×360 的 webp 与「PC · 3840 × 2160」。
- **基线影响**：文件数不变（259），总行数 25,152 → **25,244**（应用源码 23,281 → **23,373**，其中 `lib/server/wallpaper.ts` 271 → 341 行、`components/docs/apis/wallpaper.ts` 339 → 360 行；砍掉三处引导段省下的，远少于四类来源的字段行与两处实测口径要的）。文档区 4,587 → 4,608（十五篇 4,121 → 4,142 + `commonSections.ts` 466）。

## 1.19 第十五轮：一次加四个数据类接口，热搜并入 B 站

用户按上一轮的建议点了单：台风、汇率中间价、城市天气、金价，外加热搜第五家。这轮不减负，是**按实测清单加功能**——四个上游都是先打通了才动手的。

- **四个新接口**：`/api/v1/typhoon`（中央气象台台风网，编号列表 + 每 3 小时一个时次的路径）、`/api/v1/exchange`（中国外汇交易中心人民币中间价，25 个币对）、`/api/v1/weather`（中国天气网城区实况，39 城）、`/api/v1/gold`（上海黄金交易所分时行情，六个合约）。全部免 cookie 免签名免 key，国内直连可达——这是上一轮筛掉 Epic 游戏与 APOD 之后剩下的那批。
- **热搜加 bilibili**：`api.bilibili.com/x/web-interface/popular` 实测 121ms、`code:0`、20 条。刻意不取那个更"像热搜"的 `s.search.bilibili.com/main/hotword`：它的 `score` 实测恒为 0，接进来 `heat` 一列全是空值。所以 B 站这一家 `heat` 是**播放量**、`url` 是视频页直链，两处都写进了字段行与 callout（「热度数字不能跨平台比」那条正好是它的容身之处）。
- **`Au(T+D)` 的加号是个真坑**：查询串里裸写 `?contract=Au(T+D)`，`+` 按表单编码被解成空格，第一次实测直接 422——而 422 的文案里明明白白写着 `Au(T+D)`，等于自相矛盾。六个合约名都不含空格，所以在 schema 里把空格还原成 `+` 再比对。实测三种写法（`Au(T+D)`、`Au(T%2BD)`、`Au(T%20D)`）现在都是 200，`URLSearchParams` 与 requests 的 `params=` 本来就自动编码，不受影响。
- **天气的城市码表只能自己带**：官方 `city.xml` 只给到 34 个省级单位，市表端点（`city_01.xml`、`d1/citylist_all.json`）实测都返回「网页无法访问」的 HTML，`to.weather.com.cn` 查询接口 DNS 都解不了。所以按 `101 + 省码 + 市码` 的规律整理了一份 `constants/weather-cities.ts`（50 行、39 城），**每个码都实测过返回 200 且中文城市名对得上**（含 5 个计划单列市）。键取拼音而不是上游的 `nameen`，因为后者不一致：呼和浩特是 `huhehaote`、乌鲁木齐是 `wulumuqi`、台北居然是 `taibeixian`。
- **上游失败时不拿占位图糊弄**：`typhoon?id=1` 这种查无此号，上游回 404，我们转成 503 并把「上游返回 HTTP 404」原样放进 description——不去编一个空路径数组。同理金价的上游若把合约换掉（`heyue` 与请求不符）直接 503。
- **`getUpstreamJson` 长出一个能力**：台风是 JSONP（`cb(({...}))`）、天气是 `var dataSK={...}`，都不是纯 JSON。没有为此新增一个导出，而是把 `upstream.ts` 的抓取核心拆成 `upstreamText`（冷却 / 超时 / 非 200）+ `parseJsonObject`（取第一个 `{` 到最后一个 `}`），两种包裹顺手就都支持了，冷却与超时仍然只有一份实现。
- **文档四篇都走构建器，没新写外壳**；样例窗里的 `requestId`、`serverTime`、每一个数值都是这一轮 curl 出来的。有一处按纪律**撤掉**了：exchange 的 503 样例窗——那个错误无法通过入参触发，子代理拿 200 那次的 `requestId` 复用并加了句解释，这与「样例窗必须粘真实响应」冲突，而 `hotchart` 这类同样不可触发的篇目本来就没有失败窗，所以直接删。它顺手标出来的另外三处也改了：`change` 的类型回到 `number | null`（`num()` 收不出就是 null，不能因为实测都有值就写成必有）、无根据的 500 行删掉、单次取样的 568ms/3ms 从文档里撤掉。
- **还抓到我自己一处错注释**：`types/domain.ts` 里给 `price` 写的「方向反过来时是 100 人民币 = price 外币」是错的——`CNY/KRW 200.18` 只能是 1 元人民币兑 200.18 韩元。改成按 `pair` 读、并引这条实测值。
- **验证**：`npm run verify` 140 项全绿（用例数不变：登记一致性由 `catalog-sync.test.ts` 兜，四篇新文档由 `AUTHORED_DOC_SLUGS ⊆ IMPLEMENTED` 与 registry 那份 dev 期一致性断言兜）；`npm run build` 48 → **52 条路由**、静态页仍 6 个，共享 JS 102 → 103 kB。生产实测：五个端点全 200（0.13–0.45s），`/docs/typhoon|exchange|weather|gold` 四页 200、`/docs` 索引 19 条链接；参数面逐条——`?id=abc` 422、`?id=-3` 422「id 要大于 0」、`?id=1.5` 422「id 只能是整数」、`?id=1` 503「上游返回 HTTP 404」、`?city=xiamenn` 422、`?city=BEIJING` 与 `?city=` 都 200 走北京、`?contract=Au50g` 422、三种 `Au(T+D)` 写法全 200。浏览器侧四张新卡都渲染真实数据（小熊 2629 在架 + 最新时次 930hPa / 147.8°E、2026-10-09 那份牌价 25 个币对、北京 霾 24.9℃ AQI 106、Au99.99 898.00 元/克 782 个分时点），19 张卡 0 个「演示暂不可用」。
- **基线影响**：文件 259 → **275**，总行数 25,244 → **27,472**（应用源码 23,373 → **25,601**）。新增里四个数据源 326 行、四篇文档 1,190 行、四个 demo 188 行、两份常量表 65 行、四条路由 85 行，另有 `upstream.ts` 与 `hotsearch.ts` 的改动。文档区 4,608 → **5,832**（十九篇 5,366 + 466）。

## 1.20 第十六轮：nasa 改接 APOD，顺带揪出一条死链

用户指出我漏了一个端点：`https://science.nasa.gov/wp-json/wp/v2/apod-basic/`。他是对的——我上一轮试过 `wp/v2/apod`（404）就没再试别的注册名。这条才是 APOD 迁移到 science.nasa.gov 之后真正在服务的接口。

- **APOD 换源，字段全面变好**：`apod-basic?per_page=1` 免 cookie 免签名**免 key**（`api_key` 传不传都是 200，那份 key 没进仓库也没进代码），响应按日期倒序、`x-wp-total` 11,433 条。当天那条给真标题（「Ice Fishing for Cosmic Neutrinos」）、真署名（`credit` 是带 `<a>` 的 HTML，剥成纯文本「NSF, B. Gudbjartsson, IceCube Collaboration」）、`date` 直接是 YYYY-MM-DD。`id` 就用日期。
- **一个陷阱**：这个接口的 `url` 字段**不是图片，是文章页**（与 api.nasa.gov 老 APOD 语义相反），图片在 `hdurl`。
- **缩略图不再是例外**：`hdurl` 的 `dynamicimage` 会真从源图重采样——实测同一张 4000×3000 源图，`?w=0&h=0` 只给 1280×960、`?w=1920&h=1080&fit=clip` 给 1440×1080 / 281KB、`?w=640&h=480&fit=clip` 给 640×480 / 64KB。所以 nasa 与 bing 一样是「原图 + 640×480」一对，上一轮那条「thumb 与 url 同图」的例外从字段表、体积 callout 和 README 里全部撤掉。
- **`media_type: video` 不用跳过**：250 条里 25 条是视频（10%），但它们的 `hdurl` 是封面快照（实测 `Comet_snapshot.png`，200、251KB image/png），照样能当壁纸镜像。
- **揪出一条真实死链（bing 也一样中招）**：`next start` 在**启动时**就把 `public/` 登记进了静态路由表——同目录下「启动后写入」的文件 404、「启动前已在」的 200，重启（不重新构建）之后新文件就能取。也就是说上一轮起，每天第一张 bing 壁纸给出的站内直链在下次重启前都是死链，而文档写的是「存成功就由站内直接供图」。修法：`servedAtBoot()` 按文件 mtime 与进程启动时刻比较（不用启动时 readdir 快照，那会和自己的镜像写入竞态——第一版就是这么错的：懒加载读目录，读到的已经包含刚写的文件），不满足就给上游直链，文件照旧落盘，下次启动自动转成站内直链。两种情形都实测过：冷启动给 `assets.science.nasa.gov` 直链、重启后给 `localhost:3000/assets/...` 且 200。
- **上游可达性要如实记着**：这一轮中途 `science.nasa.gov` 整域开始返回自签名证书（`subject=O=redirect-cnzz`、10-10 签发），Node 与 curl 同时 `DEPTH_ZERO_SELF_SIGNED_CERT`，而 `assets.science.nasa.gov`（真 DigiCert 证书）与 `epic.gsfc.nasa.gov` 全程正常——是网络侧注入，不是 NASA 的问题。开代理后 JSON 恢复 200，本轮的实测就是这么过的。**部署环境需要能直连 science.nasa.gov**，否则 `type=nasa` 会 503（`assets.science.nasa.gov` 单独可达时也只能 503，因为拿不到清单）。
- **验证**：`npm run verify` 140 全绿、`npm run build` 52 条路由 / 静态 6 页 / 共享 103 kB。生产实测（带代理）：四类各一次全 200，`pc 2560×1440`、`mobile 1320×2903`、`bing 1920×1080 秋色中转动的水轮`、`nasa 1440×1080 Ice Fishing for Cosmic Neutrinos`，四条直链全部指向站内；两个 nasa 文件单独 curl 分别 200 / 287,246B 与 200 / 65,494B；冷启动与重启两种直链形态如上。`/docs/wallpaper` 里 APOD 口径与「本次启动前已落盘才算」那行都在页面上。
- **基线影响**：文件数不变（275），总行数 27,472 → **27,529**（应用源码 25,601 → **25,658**：`lib/server/wallpaper.ts` 341 → 392 行、文档 360 → 365、`upstream.ts` 135 → 136）。十九篇 5,366 → **5,371**，文档区 5,832 → **5,837**。壁纸正文 2,682 → **2,925** 字符（多出的主要是那条直链规则——它比省字重要）。

## 1.21 第十七轮：同构样板收成一处，422 文案改成从取值表生成

这轮不加功能，找重复。做法是先按「同一句话/同一段逻辑出现几次」数一遍，再逐个收到唯一出处。四处都过了同一道门：改完把十九篇文档的全部字符串叶子序列化出来对比，**7,531 条叶子逐字节相等**——文案一个字都没动，变的只是它来自哪里。

- **`unavailable()` 十份 → 一个异常类**：十个数据源各写了一份同构工厂（`new ApiError(503, ERROR_CODE.SERVICE_UNAVAILABLE, '<来源>暂时取不到', { description: 原因 })`），措辞全靠人对齐，而各篇文档的 503 行抄的就是这句话。现在统一成 `errors.ts` 的 `UpstreamUnavailableError(source, reason)`，10 个文件 22 处抛点都用它；工厂函数删干净，行为差异（`hotsearch` 按平台拼名字、`wallpaper` 按 type 拼）留在调用参数里，那本来就不是同构的部分。
- **`createBoardCache` 的 `toResult` 改成可省**：七个调用方里七个一模一样的「命中就把 `cached` 铺开、否则原样返回」。默认实现进 `board-cache.ts`（`passThrough`），只有真要换返回形状的才自己写——`hotsearch` 加 `count`、`hotmusic` 按 `limit` 截断那类留着，其余五处删掉。
- **广场 demo 不再二次映射**：`TyphoonDemo.tsx` 自己写了个 `strengthText()` 把 `TD`/`TS` 换成中文，而服务端 `STRENGTH_LABEL` 已经把 `strengthLabel` 放进返回体了。改成 `{point.strengthLabel ?? point.strength}`，同一份标签只有一处定义。
- **两处死再导出**：`hitokoto.ts` 与 `answerbook.ts` 各有一行 `export const loadCorpus = corpus.load;`，全仓库没有调用方（路由只用 `pick`）。删掉，同时改了 `docs/API-TEMPLATE.md` 里那段示范——它就是照着抄的，「只导出有人调的那一个」写进正文。
- **422 那句文案从取值表生成**：`public.schema.ts` 里加 `enumHint(field, values)`，九条枚举提示（`type`/`platform`/`dynasty`/`contract`）由各自的 `as const` 元组算出来，另外三条固定句式（`weather` 的城市表、`typhoon`/`netease` 的 `id`）也导成常量；zod 的 `errorMap` 与 `refine` 引用它们，**十二篇文档同样 import 它**——每篇原本有四处手抄（错误行的 `message`、失败窗的 `message`、`description` 的拼接、`issues[0].message`），十二篇共 48 处。这条是第十五轮加 B 站平台时被逼出来的：那次我改了 5 个地方，README 仍漏了三行（它还写着「weibo、douyin、baidu 或 zhihu」），本轮按实测改正。
- **加了一条机器门**：`tests/doc-422-hints.test.ts` 拿十二个 schema 逐个 `safeParse` 非法值，断言产出的 `message` 与该篇文档失败窗里印的那句相等。用例数 140 → **152**。以前只有 `doc-samples.test.ts` 管 200 样例能不能在语料里命中，失败文案没人管。
- **顺手修了自己上一轮的行尾**：`components/docs/apis/wallpaper.ts` 等 14 个文件被我的脚本写成了 CRLF，仓库 `.gitattributes` 明写 `* text=auto eol=lf`（注释里记着 `components/ui` 一度 12 CRLF + 4 LF 的事故）。全部归回 LF，现在全仓库 TS/TSX 零 CRLF。
- **为什么这处值得动**：枚举文案的漂移不是假想成本。`WALLPAPER_TYPES` 加一个值要改 1（schema）+ 4×N（文档）处，加一个平台要改 5 个文件；现在加一个值，文案自己跟着取值表变，文档跟着文案变，README 那一处仍然手抄，但它已经在 `tests/doc-422-hints.test.ts` 的门外面被记进 P2。
- **验证**：`npm run verify` 全绿（typecheck + `eslint .` + 152 项）、`npm run build` 仍 52 条路由 / 静态 6 页 / 共享 103 kB（`/docs/[slug]` 130 kB 不变）。生产实测十二个非法参数：`type=x`、`platform=x`、`dynasty=x`、`contract=Au50g`、`city=xiamenn`、`id=abc` 全部 422 且 message 与文档逐字相符（枚举九条 + `city` 那条带「共 39 个」的计数），`/docs/{wallpaper,hotsearch,poetry,weather,gold,typhoon,netease,emoji}` 八页 200、页面里印的仍是同一句。
- **基线影响**：文件 275 → **276**（多一个测试文件），总行数 27,529 → **27,594**（+65 里有 74 行是新用例）。应用源码 25,658 → **25,649**（−9：十处工厂、七处 `toResult`、两处再导出减去 12 行 import 和 schema 里新增的派生块）。文档区 5,837 → **5,849**（十九篇 5,371 → **5,383**，就是那 12 行 import；`commonSections.ts` 466 不变），十九篇正文预算一字未动（oracle 已证）。


## 1.22 第十八轮：两个新接口 + 热搜第 6 家，顺带纠正两个我自己的误判

用户点了三件：行情接口、热搜并入今日头条、气象预警。B 站热门视频那条经查已经在热搜里了（`platform=bilibili` 抓的就是 popular 榜），按「保持现状，不动」处理。**公开接口 19 → 21，文档十九篇 → 廿一篇，用例 152 → 162。**

- **`/api/v1/stock`（腾讯行情）**：一次最多 20 个代码，沪 / 深 / 北 / 港 / 美混写都行。三处坑都是实测出来的：① 上游是 GBK，`Response.text()` 按规范只认 UTF-8，所以 `upstream.ts` 加了 `getUpstreamBytes`，由数据源用 `new TextDecoder('gbk')` 解（Node 24 自带，零依赖）；② **位序不是一套**——A 股族 88 段、港股 78 段、美股 73 段，第 46 段在 A 股是市净率、在港美是英文名，所以基础位序共用一张表、扩展位序按族分表；③ 量纲不统一（A 股成交量是手、成交额是万元，港美是股与元），出参统一成股与元，跨市场才可比。
- **`/api/v1/stock` 的两个刻意选择**：**不缓存**——`createBoardCache` 没有淘汰，拿 codes 组合当键会让那个 Map 无界长大，而给旧价比给慢价更糟（实测热路径 18ms，本来就不需要缓存）；查无此码返回 **404**（公开接口里第一个 404），因为上游对合法但不存在的代码只回一行 `v_pv_none_match="1"`，把它翻译成空数组是骗人、翻译成 503 是嫁祸上游。部分命中仍是 200，只是 items 少一条、`requested` 与 `count` 不相等。
- **`/api/v1/warning`（中央气象台）**：上游 `rest/findAlarm` 的筛选值**只认中文**（实测 `province=ABJ` 回 0 条、`province=北京市` 才有），而这些中文就是官网页面三个 `<select>` 的 option value——类型 13、等级 4、区域 31。本站参数面不放汉字，于是落 `constants/warning-signals.ts` 码表（键取拼音，陕西多写一个 a 才不与山西撞），翻译只在服务端发生一次。缓存只有一个键：全量取回后在本地筛，筛选组合再多也不会把缓存撑爆。
- **上游列表项只有五个字段**（alertid / issuetime / title / url / pic），类型与等级都是从标题正则抠出来的。**纠正第一处误判**：初版按「上游单页封顶 200 条」写了三页串行的取数，实测那是我把「pageSize=200 就回 200 条」当成了上限——pageSize=500 一次就回满（totalPage=1）。三页串行冷取 2.4 秒起，还抽到过一次 8 秒超时直接 503；改成单页取完后，冷取 1.9–4.8 秒、命中缓存 4ms。
- **第二处误判**：港股时间的分隔符是 `0x2F`（斜杠），美股与气象台是 `0x2D`（横杠），我按横杠写正则，**港股的 `quotedAt` 整列成了 null**。是抓 200 样例时对字节才发现的（终端会把 / 显示成 -，肉眼看不出，只有打码点能确认）。现在 `parseWallClock` 两种都认，`tests/time.test.ts` 把这两种形态用转义写死，另加夏令时 / 冬令时与越界输入，共 6 条用例。
- **类型口径要如实留痕**：官方下拉只有十三类，实测此刻 330 条里有 42 条在十三类之外（雷雨大风、地质灾害、山洪灾害、海上雷雨大风、雷暴大风、道路冰雪、森林火险、其它气象灾害）。这些条目照实返回、`signalType` 为 null、也无法用 `type` 筛——文档把这条写进「类型口径」与 `type` 参数行，不把 null 藏起来。等级与区域则是 100% 解析得出（0 条 null）。
- **热搜并入今日头条（第 6 平台）**：上游 `data` 就是榜单（另有一个 `fixed_top_data` 是置顶位，不参与排名），`HotValue` 是字符串数字、实测 50 条严格降序，所以 rank 取下标。**`Url` 挂了约 700 字符的 `log_pb` 跟踪参数**（内嵌一段转义过的 JSON 与签名），剥成 origin + path 后全量响应体从 44,427 字节降到 6,752 字节。因为上一轮把 422 文案改成了从取值表生成，这次加一个平台**只动了取值表一行**，四篇文档与 README 的文案自动跟随。
- **抓出两处第十五轮留下的口径漂移**：车单 `hotsearch.desc` 还写「微博 / 抖音 / 百度 / 知乎」（四家）、README 的接口表还写「五家平台榜单」。这类描述性文字手抄在三处，派生常量管不到它——记进 §2 的 P2。
- **验证**：`npm run verify` 全绿（162 项，比上一轮多 10 条：时刻解析 6 条 + 文档 422 用例 4 条）；`npm run build` 52 → **54 条路由**（其中 API 40 条），静态仍 6 页，共享 JS 103 kB，`/plaza` 144 → **145 kB**、`/docs` 128、`/docs/[slug]` 130、`/login` 148。生产实测：行情三个代码 200（1,698B，热 18ms）、20 个代码 200（7,703B 但只回 16 条，另 4 条查无）、`codes=abc` 与空串与缺参都是 422、`sh999999` 404、POST 405 无响应体、OPTIONS 204；预警全量 338 条 111,737B（冷 4.8s / 热 4ms）、`level=red` 4 条、`region=liaoning&type=fog` 49 条、三个非法值各自 422、`limit=101` 422、POST 405；热搜 `platform=toutiao` 50 条 143ms、`platform=x` 的 422 已是六家；`/docs/stock` 与 `/docs/warning` 都 200，响应窗四个齐（200 + 三条 422）；广场 21 张卡里两张新卡拿到真实数据（行情五市一行一只、预警 338 条带四色计数），热搜卡轮到「今日头条热榜」。回归：`wallpaper?type=nasa`、`gold?contract=Au(T%2BD)`、`weather?city=hangzhou` 三条老路径都 200。
- **基线影响**：文件 276 → **286**（+10：两个数据源、一份时刻解析、两份码表、两条路由、两篇文档、一个用例文件），总行数 27,594 → **29,328**。应用源码 25,649 → **27,329**（+1,680，能逐文件量到的：`stock.ts` 125、`warning.ts` 180、`time.ts` 58、两张码表 143、两条路由 46，其余是类型、schema、客户端封装与两篇文档）。文档区 5,849 → **6,617**（廿一篇 6,151 + `commonSections.ts` 466），正文最长两篇 stock 3,261、warning 3,202，都是字段行数摆在那儿（29 与 16 个字段），不是话多。测试 26 文件 1,945 行 → **27 文件 1,999 行**。

## 1.23 第十九轮：出口并发闸——多来源齐发时，上游只看到 6 个在途

用户问的是「多个 IP 同时打行情接口会怎样」。答案是：**当时没有任何一层在管**。三道限流桶的键都以来源 IP 打头（`protection.ts:117/129/146` 的 `global|${ip}`、`default|${ip}|${method}|${routePattern}`、`rule|${id}|${ip}`），所以限额只能压「每个来源多快」，压不住「合计打到上游多猛」——100 个来源就是把上限乘一百；而 `trace.ts:65` 取的是 `x-forwarded-for` 首段（注释自己写着可伪造），直连部署时轮转这个头连「真有一百个来源」都不需要。行情又是全站唯一「一进一出、不缓存」的接口，每个入站请求都对应一次真实回源。

- **做法**：`utils/upstream-gate.ts`，**每个主机一道闸、同时在途 6 个**，第 7 个起在原地等名额，等满 1 秒还没轮到就抛普通 Error——由各数据源原有的 catch 换成 503「<来源>暂时取不到」，`description` 带「上游并发已满（每主机 6 个在途），等待 1000 毫秒仍没有名额」。接线只有一处：`upstream.ts` 的 `upstreamBytes` 是所有回源的必经路（`getUpstreamJson` / `postUpstreamForm` / `getUpstreamBytes` 都走它），闸包在 fetch 与读 body 外面，`finally` 里释放。
- **为什么按主机而不是全局一道**：慢上游不该拖快上游。气象预警一次全量 1.4–6.4 秒，行情只要 5–18 毫秒，共用一道闸会让行情跟着垫底。
- **为什么不记冷却**：等不到名额是我们自己忙，不是上游失败。`upstream.ts` 的 15 秒冷却只该记连不上与超时，把排队也算成失败会把一次抖动放大成全站 503。
- **名额直接交接**：释放时如果有人在排队，就把释放函数交给它、不动 `active`——否则中间插进来的新请求会抢走刚腾出的位置，排队的反而饿着。
- **实测（生产，闸=6 / 等待 1 秒）**：单发 `?codes=sh600519` 48ms；24 个不同代码组合齐发 → 全部 200，总跨度 125ms，单请求 min 55 / p50 102 / p95 118 / max 121ms（对上游由 24 并发被压成 6 并发，多出来的 ~50ms 就是排队）。压满一次预警后紧接着取行情仍然 68ms 答复，证明分主机各一道闸有效。
- **拒绝路径怎么验的**：把两个常量临时改成 1 道 / 200ms，在 dev 上 120 并发齐发——上游单次约 5ms，串行 120 段只需 ~600ms，多数请求在 200ms 内排到了队，而**同 IP 的洪泛先被 120 次/分钟的来源限额挡住**（实测 30 个 429）。所以生产里要真的把 6 道闸压溢出，需要的是几百个不同来源，那不该拿第三方做靶子；拒绝分支由 `tests/upstream-gate.test.ts` 精确锁住：闸满后第 7 个不立刻失败、释放即交接、等满 1,010ms 抛「上游并发已满」且**一个名额都不占**（放开后仍能重新拿满一轮）、别的主机不受影响。
- **容量算术**：6 道闸 × 上游 5–18ms ⇒ 出口能力约 300–1,200 次/秒，远大于一个免鉴权公开接口该有的量；真到那一步是先排队、再 503，而不是把腾讯打出限流再把我们自己的来源封掉。
- **刻意不做**：不加 env 开关（阈值是工程取值，不是部署差异；要按接口收紧就用后台规则）；不给 stock 补缓存合并（那是另一档收益，等真有大流量）；不拦 `wallpaper.ts` 的镜像下载（它一天只写一个文件、天然有界，且走的是后台路径不占请求）。
- **一个诚实的边界**：闸是**进程内**的。多实例部署时每实例各 6 道，合计出口并发是 6 × 实例数——这与 `REDUCTION-PLAN` §3 里「限流窗口已走 KvStore 可跨实例、缓存与指标刻意留进程内」是同一条权衡，跨实例共享这道闸要引 redis 计数，代价大于收益。
- **验证**：`npm run verify` 全绿（162 → **165**，新增 3 条闸的用例）；`npm run build` 通过；恢复默认值后重跑上面的生产实测。
- **基线影响**：文件 286 → **288**、总行数 29,328 → **29,475**（+147：闸 69 行、用例 70 行、`upstream.ts` 从 146 → 154 行）。测试 27 → **28** 个文件、1,999 → **2,069** 行。文档区不变（README / API-TEMPLATE / 分析报告各补了口径，见下）。


## 1.24 第十九轮（续）：把冷回源这条路量了一遍，改的是三处真实耗时

用户要的是「分析所有接口逻辑，看能不能优化性能」。做法是先量再改：起一个干净的生产进程，34 条路径每条打三次（冷 + 两次热），客户端记总耗时、服务端日志给 `durationMs`，然后只看那条真正慢的。

- **热路径没有可优化的地方，这条要先说清。** 命中缓存时服务端只要 **0.12–0.45ms**（`/api/v1/hotsearch`、`/api/v1/gold`、`/docs` 骨架的 plaza 端点都是这个量级），整条包装链——AsyncLocalStorage、三道限流桶、维护模式判定、安全头、统计记账——全在 1ms 内。所以 `getSiteSettings()` 每次 clone 28 个布局对象、`policy()` 每次重建一个配置快照这类「看着像开销」的东西，量下来不值得动；为了它们改接口形状是负功。
- **真正的问题在冷取，而且集中在一个接口**：`/api/v1/warning` 服务端 **11,276ms**。原因是我上一轮写死了「单页 500 条就取完」，而傍晚大雾预警从 330 条涨到 **668 条**，上游一页只给 500，于是循环又翻一页——每页本身要 1.6–5.9 秒，串行两页就破 11 秒，已经越过文档承诺的 8 秒上限（单请求 8 秒超时是每次回源各算，所以两页不会自己掐断）。
- **改法**：先取第一页拿 `totalPage`，剩余页一次 `Promise.allSettled` **并发**取完，页大小改回 200（实测一页 200 条 1.6–3.8 秒、一页 500 条要 5.9 秒，小页更适合并发）；上限五页 = 1,000 条，再多按 `truncated` 如实标。某一页失败不再整体作废：已取到的照发、`truncated: true`。结果：**冷取 11.3 秒 → 2.7–5.5 秒**（两次实测各有起伏，因为上游本身就慢且不稳），热 12ms，668 条一条不少。
- **顺手两处**：① `parseWallClock` 每次换算都新建一个 `Intl.DateTimeFormat`，实测单次 0.057ms、复用后 0.008ms——668 条要换算 1,336 次，省 ~40ms。这不是主因（我先怀疑它是 11 秒的元凶，量下来只值 40ms，**猜错就说猜错**），但一行 Map 缓存换来的是「条数越多越省」，留着。② 网易云的歌曲详情与热评评论都只依赖 songId，原先一个 await 一个，改成 `Promise.all`；**实测差异在噪声内**（396/501/457ms vs 606/491/432ms，评论那一趟占大头），保留改动但不写「省了多少」。
- **顺带抓到两条解析盲区**（同一批实测里冒出来的）：机构写「…气象**分局**发布…」的 2 条因为锚只认「气象台发布」而连等级都丢，锚放宽成「气象台|分局」后 **668 条里等级 null = 0**；「天津海洋中心气象台发布海上大风…」1 条归不到 31 个省名任何一个（表里是「天津市」），这种就照实给 `region: null`，不做前缀模糊匹配。类型解析不出的是 39 条（筛选器外的那些种类），这条口径文档里本来就有。
- **`/api/v1/stock` 期间出现过 503，但不是闸的问题**：0.19ms 就返回的 503 是 `upstream.ts` 的 15 秒冷却——上一轮我拿 200 并发打它，腾讯那侧短暂无响应，冷却按设计把后续请求短路掉了（这正是冷却该干的事）。15 秒后自愈，复测 200。
- **验证**：`npm run verify` 165 项全绿（用例数不变）；`npm run build` 通过；生产复测 34 条路径全 200，热路径 min/p50/max = 1 / 2 / 12ms，冷取最慢的仍是预警（2.7–5.5 秒）与台风列表（1.1 秒）。文档同步：预警那篇加了 v1.1 更新日志与「每页 200、最多 5 页并行」两行（正文 3,160 → **3,408** 字符）、`API-TEMPLATE` 数据源一节新增「会翻页的上游要并行取页」、分析报告新增 O25、基线表 29,475 → **29,518** 行。
- **还剩什么没做**：给榜单类缓存加「过期先回旧数据、后台刷新」（stale-while-revalidate）能把那 2.7–5.5 秒从用户面前完全挪走，代价是数据可能旧一个刷新周期、`cached` 的语义要重新定义——这是产品口径不是工程口径，等用户点头再做。（用户点了头，做完了，见 §1.25。）


## 1.25 第二十轮：过期不再让请求去等上游，JSON 出网前压掉 12 倍

用户给了两件事：「1. 给榜单类缓存加 stale-while-revalidate 2. 继续分析看是否可以优化」。两件事都落在同一个前提下——**只改真正量得出差别的地方**。

**（一）stale-while-revalidate。** 改在 `board-cache.ts` 一处（118 行），十个上游数据源共用同一份行为：TTL 内照旧命中；TTL 过后**先把上一份发出去**（`cached` 仍为 true），刷新交给后台那一路；后台失败退避 15 秒、继续供旧数据并记一条 `board.refresh` 警告；超出兜底窗口就当没有缓存，回到阻塞取数。

- **兜底窗口第一版按「10 倍 TTL」写，量下来不对，改成「一个 TTL，短榜不少于 10 分钟」**。乘十对 60 秒的榜正好（热搜最坏给 11 分钟前的数据），但对汇率、票房榜那种一小时缓存就变成「把十小时前的牌价当现价供」，而它自己文档承诺的是「一小时的缓存」。规则改完补了一条用例钉住它（长 TTL 只宽限一个周期）。
- **缓存键封顶 64 个**，超出淘汰最久没刷新的键。大多数榜单的键是固定的几个平台，但 `typhoon?id=` 是调用方给的任意编号，一条路径 31KB——不设限就是无界增长。
- **生产实测**（隔离副本 + 3100 端口，`/api/v1/warning` 60 秒 TTL）：冷取 1,617.54ms（673 条）→ TTL 内命中 1.81ms → **过期后那一枪 3.04ms，`updatedAt` 仍是 14:10:02.056Z 那一份**，说明这一答没有等上游 → 8 秒后再问，1.85ms 拿到 14:11:05.278Z 的新数据、660 条。后台那一次刷新自己花了约 1.7 秒，用户一秒没等。金价同一套路：冷 212.19ms → 命中 0.25ms → 过期首发 1.65ms（旧数据）→ 下一枪 0.43ms，上游时刻已从 14:09:53 换成 14:10:53。两轮都没有 `board.refresh` 警告。
- **`cached` 的语义变了，九篇文档的那一行必须跟着变**：true 不再等于「还在 TTL 内」，只等于「这一答没等上游」。九处手写收成 `commonSections.ts` 的 `cachedRow(ttl)`（九个文件 −16 行，共享处 +30 行，从此这句只有一处可改）。语料类与素材类三篇（一言、答案书、古诗词…走 `createCorpusCache` / `static-assets.ts`）不受影响，口径照旧。

**（二）继续分析：热路径确实没得动，但出网的字节有。** 先说没做的：语料首取实测 5–18ms（`ChengYu.json` 1.28MB 也就一次读盘 + parse）、二取 3ms；`/docs/[slug]` SSR 24–76ms；`/api/v1/stock` 不缓存是对的，冷取 12–125ms，加缓存只会让行情更旧而省不出用户能感觉的时间。**这三条都不动**，写在这里是为了下次别再量一遍。

真正的问题是一条漏网的：`next start` 自带的压缩**只作用于页面，不压 Route Handler 的响应体**。同一个进程里 `/` 带 `Content-Encoding: gzip`，而 `/api/v1/warning` 在客户端明确声明 `Accept-Encoding: gzip` 时仍然原样发 **262,245 字节**（gzip -6 只要 20,910）。补一层在 `withApiHandler` 出口（成功与失败两条路都过）：`lib/server/compress.ts` 39 行，门槛一千字节，非 JSON、带 `Set-Cookie`、已编码的一律不碰——带 cookie 那条是刻意保守，登录一次写三个 cookie，不值得为了压缩去猜 `Set-Cookie` 怎么并头。

- **实测**：预警全量 264,193 → **21,022 字节**，热搜单平台 11,947 → 4,137，票房榜 15,500 → 3,367，台风 4,041 → 1,558，车单 7,654 → 3,334；阈值以下不压（health 241B、422 报错体 371–593B）。压缩本身在 262KB 上 level 1 = 1.30ms / 26,409B、level 6 = 1.72ms / 20,910B、level 9 = 2.98ms / 20,147B（Node 24），取默认的 level 6 并用 `zlib` 线程池跑，不占事件循环。回环地址上 gzip 那一侧墙钟多 1.5ms（5.9ms → 7.4ms），换掉的是 243KB 的传输量。
- **浏览器侧复核**：广场页内 `fetch('/api/v1/warning?level=red&limit=3')` 拿到 `content-encoding: gzip`、`content-length: 641`，JSON 正常解析出 3 条中文标题；控制台只有未登录本就该有的两条 401。文档站的响应头一节加了 `Content-Encoding` 一行（21 篇共享）。
- **统计口径要注意**：`recordApiCall` 在压缩之前记账，所以日志里的 `durationMs` 不含压缩耗时（命中态 1.4–4.4ms 那批数字因此两侧都一样）。这条不是 bug，但引用日志数字时必须知道。

**验证与账面**：`npm run verify` 全绿，用例 165 → **174**（board-cache 九条、compress 五条）；生产构建通过；廿八条路径 + 五条负例在新进程上全数复测（见上）。文件 288 → **290**、TS 行数 29,518 → **29,803**（+285 里两个新文件占 121：`compress.ts` 39 行、`compress.test.ts` 82 行；`board-cache.ts` 现在 118 行、`board-cache.test.ts` 193 行；文档区 6,622 → **6,636**，廿一篇 6,156 → 6,140、`commonSections.ts` 466 → 496——九篇手写的 `cached` 行收成一处调用，减了 16 行，共享那处加了 30 行，从此这句话只有一处可改）。测试 28 → 29 个文件、2,069 → 2,246 行。

**这轮踩的坑要说一句**：按上一轮的流程跑了 `npm run build`，而用户的 dev server（3000/3001）共用 `.next`，生产产物把它盖了——那个 dev server 当场全线 500。README 里本来就写着这条禁令，是我没守。后来的实测与构建全部改在**项目外的隔离副本**里做（robocopy 一份源码 + `node_modules` 目录联接 + 独立 `.next` + 3100 端口），dev server 一个字没动；下次要量生产行为就走这条路，别再在主目录 build。


## 1.26 第二十一轮：卡片布局独立成页，并真的能排序

用户三件事：「1. 卡片布局的界面单独创建一页而非放在设置那里 2. 美化卡片布局的样式 UI 3. 可以更改接口的排序以达到自定义最佳的布局」。

- **页面**：新增 `app/admin/cards/page.tsx` + `components/console/views/cards/CardLayoutView.tsx`（472 行），侧边栏「系统配置」多一项卡片布局（`ROUTES.adminCards`、新图标字形 `layout` / `grip`）。`SettingsView.tsx` 520 → 301 行，两块布局面板与随之无用的 `updateCardSpan` / `nameOf` / `addLiveCard` / `plazaRows` / `CardLayoutPreview` / 车单请求全部搬走——留在原地只会变成「改了没人看见的字段」。网站设置页头给了「去卡片布局」的链接，老用户的肌肉记忆有落点。
- **顺序**：`layoutOrder(layout, ids)`（`constants/card-layout.ts`）把「数组顺序即渲染顺序」定成契约：布局里没写过的接口按车单顺序接在末尾，布局里已失效的 id 直接丢掉。广场原来只按 id 取跨度、顺序无关，现在 `PlazaBoard` 先按它排 `items` 再进 `rankCatalog`——**默认视图吃布局顺序，搜索命中仍吃相关性**（`scoreApi` 无关键词时返回 1 分、同分靠 `items.length - index` 保序，所以排序权交给布局不干扰打分）。`types/domain.ts` 与 README 的说法同步改掉。数据形状没变，所以 `SETTINGS_SEED_VERSION` 不 bump。
- **UI**：拖拽 + 键盘两条路都在。把手（`grip`）按下才给这一行开 `draggable`——整行 `draggable` 会让行里的 `<select>` 在 Firefox 打不开；落点行有虚线主色描边，拖动中的行降到 45% 透明度。↑/↓ 两个按钮与把手上的 ArrowUp/ArrowDown 共用一次重排，移动后焦点跟到同一张卡，读屏用户不会按完下移就掉回第一行。首页与广场切成两个 tab（`Segmented`），右侧预览常驻并跟着 sticky，预览格子里带序号，与左列一一对得上。脏态从「按字段名记脏集合」改成两组布局各比一次 JSON，标题栏直接写「N 组布局待保存」。
- **实测**：`npm run verify` 179 项全绿（新增 `tests/card-layout.test.ts` 五条：顺序、新接口接末尾、失效 id 丢弃、缺失跨度回落默认、默认布局覆盖车单全集）。生产构建通过，`/admin/cards` 注册为动态路由（首屏 10.4 kB）且未登录 `307 → /login?redirect=/admin/cards`。**排序链路是在隔离副本里端到端量过的**：临时把默认广场布局整个反转再构建，`/plaza` 的 `<article>` 顺序就从 `hitokoto, answerbook, wallpaper…` 变成 `warning, stock, gold, weather, exchange…`，浏览器里同一次改动下搜「一言」第一条仍是 `hitokoto`——顺序生效、相关性没坏。副本已删。
- **没做到的**：拖拽交互本身没在浏览器里点过——那是登录后的控制台页面，我不使用你的口令。构建、类型、门禁都过了，但「按住把手能不能顺畅拖到底」「窄屏两列塌缩后长什么样」需要你登录后看一眼。要我用某个可登录的本地账号自查也可以，你说一声。

## 1.27 第二十二轮：部署段补全，以及一次我自己造成的删除

**部署段（README）**：按用户「顺手把 README 部署段也补全」的要求，把「上传哪些文件、怎么起、环境变量怎么验」写清楚，每条都是量出来的，不是抄 Next 文档：

- 运行只需要 `.next`（可去掉 `.next/cache`）+ `public/` + `package.json` + 目标机上 `npm ci --omit=dev` 的 `node_modules`。实测：拿这四样搭一个空目录起进程，`/api/health`、`/api/v1/*`、`/assets/json/*`、`/`、`/docs/gold`、`/plaza` 全 200，`/admin/cards` 按预期 307 去登录。
- `.next` 156 MB 里有 148 MB 是 `.next/cache`（构建缓存，运行期不用），真正要上传的是 8 MB；`public/` 28 MB / 476 个文件。
- **`next.config.ts` 不用带**：headers 在构建期烘进 `.next/routes-manifest.json`（实测把它移走后 `/assets/**` 仍是 `immutable` / `max-age=300, swr=600`）。反面结论写进了文档：改 headers 必须重新 build。
- 运行期依赖闭包只有 14 个包，出自 Next 自己写的 `.next/next-server.js.nft.json`；`server-only` / `typescript` / `eslint` / `postcss` / `tailwindcss` / `tsx` 都不在其中，所以 `--omit=dev` 够。
- **env 不对不会拦住启动**：无 `JWT_SECRET`（以及沿用 `.env.example` 示例值）时 `next start` 照样 `✓ Ready in 629ms` 并监听，但之后每个 `/api/*` 都是 500，日志里是「环境变量校验失败 … - JWT_SECRET: Required」，而 `/`、`/docs` 因为构建期预渲染仍回 200。这条决定了验收命令必须打 `/api/health`，看首页是没用的。
- 缺 `public/` 的形态也量了：`/api/health` 200、语料类接口 500（`ENOENT ... hitokoto.json`）、`/assets/json/*.json` 404。
- `nohup start` 报错的根因写进文档：nohup 要的是可执行文件，脚本名得 `nohup npm run start`；换端口实测 `npm run start -- -p 3422` 起得来。

**事故**：清理临时副本之后，仓库的 `tests/` 整个没了（30 个用例文件 + `register.mjs` + `fixtures/`）。原因是我把隔离验证目录建在项目旁边，清理时的删除动作波及了工作树——不复现到底哪一步了，我只说我确定的：**是我造成的，且当时没有第二份可对照**。恢复过程与结果：

1. `~/.qoder-cn/projects/E--Program-v4/<session>.jsonl` 里的 `file-history-snapshot` 带「相对路径 → 快照文件名」映射，按它取每个文件 `backupTime` 最大的那份，还原 18 个（含今天新写的 `compress.test.ts`、改过的 `board-cache.test.ts` 与 `upstream-gate.test.ts`）。
2. 8 个是 git 里跟踪过的，从 HEAD 取；它们带着早先约定里的 `import './setup'`（`setup.ts` 那轮已删），去掉这行就与现行代码一致。
3. 用户提供的 `E:\Program\v4.tar`（10-11 14:21 打包）补上了映射与 git 都没有的 5 个：`jwt` / `users-store` / `auth-schema` / `corpus` / `http-client`。合并规则是「今天的快照不动、git 旧版让位给 tar」，避免用旧覆盖新。
4. `card-layout.test.ts` 是今天写的、快照与 tar 都没有，按原样重写。
5. 结果：`npm run verify` **179 项全绿**，与丢失前的用例数一致；typecheck 与 lint 无输出。

顺带查出来两件事：`lib/server/store/users.ts` 的种子账号 23:13 被改成了用户自己的账号，而旧用例和 `LoginForm.tsx:158` 都还硬写着 `admin`——所以那 2 条失败不是恢复没做好，是文案与用例落后于种子。改法：store 导出 `SEED_ACCOUNT` 供用例引用，测试自己用 `scrypt` 造哈希、不再需要任何真实口令；登录页那句话改成不点名账号的说法。

**这条要守住**：临时验证目录一律建在仓库之外，删除动作只对被自己创建的路径执行；而这次的根因级防护是**把工作树提交**——30 个用例文件从没进过 git，才是它们会丢的原因。要不要我帮你提交这一版，等你一句话。

## 2. 下一步（按收益排）

### P1 种子口令写在被跟踪的源文件里

`lib/server/store/users.ts` 的 `DEMO_PLAIN` 是明文口令，而这个文件不在 `.gitignore` 里（被忽略的是 `.env.local`）。2026-10-12 种子账号换成了使用者自己的账号，等于把真实登录口令放进了版本库路径。可做的收法（要你点头，动的是登录语义）：种子改从环境变量读（`ADMIN_ACCOUNT` / `ADMIN_PASSWORD`，不设就不种子账号并在启动日志提示一行），`env/index.ts` 与 `.env.example` 各加一键——`tests/env-example.test.ts` 会自动盯住示例文件与 schema 的一致性。在这之前，建议把这个口令按已泄露处理换掉一次。

### P1 Epic 每周免费游戏：等出口，不等代码


接口本身是清楚的——`GET /api/v1/epic`，返回本周在架的免费游戏（名称、封面、原价与截止时刻、`openUrl`）。**卡在没有能拿到数据的上游**：官方那份 JSON 只在 `store-site-backend-config.akamaized.net`，本机 DNS 解析不了它（`akamaized.net` 整域），商店页 403（Cloudflare 挑战），`store-content.ak.epicgames.com` 的 7 条历史路径统一 404，`graphql.epicgames.com` 回 `Gone`。逐条证据在 §1.18。

真要做的顺序：先确认部署环境有境外出口 → 起进程时带 `NODE_USE_ENV_PROXY=1` + `HTTPS_PROXY`（Node 24 的 `fetch` 默认不认代理）→ 按 §1.17 那条六处登记链走一遍 → 文档的「外部依赖」行必须写明「本接口要求服务器能直连 epicgames 域，国内直连部署会稳定 503」。在拿到真数据之前不写代码，也不拿别人的第三方镜像凑——那正好是 §5 里「无源的整条删」要避免的那种东西。

### P2 平台清单这类描述句还抄在三处（第十八轮又漂了一次）

车单 `API_CATALOG` 的 `hotsearch.desc`、README 的接口表、文档模块的 `overview` 首段与 metaRows 都在用自然语言列「微博 / 抖音 / …」。派生常量只管得到 422 那句 `message`，管不到这些散文——第十五轮加 B 站时 README 漂了，第十八轮加今日头条时车单又漂了一次（desc 还停在四家）。可做的收法：车单 `desc` 与文档 metaRows 都从 `HOT_SEARCH_PLATFORMS` 拼（`desc` 里那句「六家平台榜单」本来就是数组的长度 + 名称表），README 那一行由 `tests/doc-numbers.test.ts` 那类用例核对——它已经在核对 README 里的接口数量与超时数字。前提是先确认「散文由数组拼出来」读起来不别扭；别扭就只加用例核对，不硬拼。
### P2 两篇文档还在传 request 引导段

`answerbook.ts:52`、`hitokoto.ts:41` 仍给 `requestSection` 传 `lead`，内容就是模板 §2.2 点名禁止的「一行 GET 就够了…」。本轮把壁纸那篇的三处引导段删了（它当时正文最长），这两篇删完会各降 60–90 字符，但 §2.2 里记的十篇区间（1,418–1,796）要跟着重测，所以单独留作一件小事，别和加功能的轮次混在一起改。

### P1 十二篇上游/榜单文档的示例响应仍是手抄

`responsePanes` 的 `data` 段是人工粘进来的真实响应（真实正是它的价值，见 §5 纪律）。代价是字段一改，文档不会自己红——本轮按 `types/domain.ts` 与语料比对时抓到 `hitokoto` 的样例漂了三处：半角逗号替全角、句末「。」丢了、`source` 从「蝶恋花·阅尽天涯离别苦」缩成「蝶恋花」。已按语料原文改正，并补 `tests/doc-samples.test.ts`：**语料类两篇（一言、答案书）的 200 样例现在必须能在 JSON 语料里逐字段找到**，抄错即红。

剩下一半没有可比的数据源：十二个上游/榜单类接口（第十三轮的网易云热评与第十五轮的台风 / 汇率 / 天气 / 金价都在内）返回值每次都变，只能比**形状**。可做的两件事：

1. 给成功样例加一个运行时形状用例——`JSON.parse` 后与该接口的返回类型做键集比对（调用处 TS 已经比对过，样例窗还差这一步）。不需要起服务。
2. 真要刷新取值时，用手动脚本按 `API_CATALOG` 拉十四个上游接口落 `components/docs/fixtures/<slug>.json`，文档模块 import 后交给 `successPane({ dataJson })`。约束：**只放在 `npm run thumbs` 那一类手动脚本里**（生成要起服务，不能进 `npm test`），且「… 实测共 51 条」这类注释尾巴仍由人写，脚本不猜。

第十一轮按「样例里的 id 能不能在本文档别处对上」这条口径先扫了一遍，抓到并修掉一处：`hotsearch` 的响应头示例 `traceId` 与它自己两个响应窗里的 `requestId` 都对不上，而 `commonSections.ts` 两处文案都写着「与 requestId 同值」（其余 13 篇一致）。同一轮把八处「缓存实现」行与七处 500 建议句收成了共享常量——样例窗本身仍是手抄，这两条建议仍然有效。

**第十七轮把这十二篇的另一半管住了**：422 那句改成从 `public.schema.ts` 的派生常量 import，`tests/doc-422-hints.test.ts` 拿十二个 schema 逐个 `safeParse` 非法值，断言产出的 message 与该篇失败窗印的相等（用例 140 → 152）。所以「抄错即红」现在覆盖 422 文案，不覆盖 200 样例——上面两条建议针对的仍是 200 样例。

### P2 日志接口的五个筛选参数没有发送方——等你一句话

`logListQuerySchema` 里的 `path` / `ip` / `cacheMissOnly` / `from` / `to` 没有任何 UI 会发（`LogsView` 只发分页、排序、关键词、状态、状态族、方法），但它们在 `lib/server/metrics.ts` 有实现、在 `tests/metrics.test.ts` 有断言（含 CIDR 口径与「undefined 不算缓存命中」）。删掉约 45 行；**这与第一轮删的 `dashboard?live` 不同类**，那个参数根本不做任何事。两条路：把筛选补进日志页工具条（三个下拉 + 一个时间区间，成本比删更高），或者你说「删」我再动。第十二轮按不动处理。

### P2 `/docs/[slug]` 保持动态：我算过账，不做了

`app/docs/[slug]/page.tsx:26` 是 `export const dynamic = 'force-dynamic'`。原计划改成静态 + `revalidateTag`，评估后放弃：生产 SSR 的 TTFB 实测 9–27ms，11 个文档页的动态渲染成本几乎为零；而标签失效要在 4 个写入口（`apis`、`apis/[id]`、`settings`、`rules`）各加一行 `revalidatePath`，并且 `revalidateTag` 不能在 Route Handler 之外调用，`tests/catalog-metrics.test.ts` 直接调 `listManagedApis()` 这类函数，一旦把失效逻辑写进 `catalog.ts` 就会在测试里炸。**多花的复杂度买不到可测量的收益**，所以留着 force-dynamic，并在文件注释里写清理由（已经写了）。

### P2 观测数据仍然刻意不持久化——配置与限流已经分出去了

`constants/app.ts` 的 `CALL_RING_CAPACITY = 500`，重启清零；`metrics.ts` 按区间过滤，长区间（7d / 30d）实际受缓冲上限约束。

后台配置与限流计数已经统一到 `lib/server/store/kv.ts` 的 `KvStore`（默认内存挂 `globalThis`，`KV_BACKEND=redis` 时跨实例共享），这是多实例正确性必需的一层，语义与局限 README 已写明：冷启动水合一次 + 写操作镜像，属于「启动对齐 + 写传播」，不是跨实例实时读。

**调用观测数据（环形缓冲、日志页、仪表盘）刻意留在这个抽象之外**：它要的是「本进程看见了什么」，持久化就得引入清理策略、时区换算、并发写与迁移，而控制台显示的每一个数字都要能被 `curl` 当场复现——一旦落库，「最近 500 条」这句话就变成需要额外解释的口径。容量常量已经单点，别再往这条链上加存储。

### P3 明确不加的能力

每加一项都要带来校验、UI、文档与测试四份负担，当前都抵不过：

- `X-Cache` / `X-RateLimit-*` 响应头（对外承诺最难收回）；
- 一言的 `type/min/max/count/callback(JSONP)`（JSONP 等于放弃 CSP）；
- 多角色与账号体系（`constants/auth.ts` 已注明刻意只留 admin）；
- 令牌吊销表 / 全设备登出（无状态令牌的必然配套，等于引入存储）；
- 验证码类处置（上一轮刚删掉 `captcha`）。

### P3 体积与依赖

- `class-variance-authority` 的消费方是**三个组件**，不是上一轮记的一处：`components/ui/button-variants.ts`（`cva`）、`Button.tsx` 与 `Select.tsx`（`VariantProps`）、`Input.tsx`（`cva` + `VariantProps`，`controlVariants` 那份）。换成手写 variant→class 映射可以少一个运行时依赖，但 `cn()` 的冲突消解与 variant 键的联合类型都要自己写回来，`VariantProps` 省下的那几行会还回去。收益小、面比原先记的大，先不动。
- 素材 25 MB 中 21.7 MB 是原图、2.5 MB 是派生图。重编码 JPEG（quality 78–82）预计省 15–20%，但必须人工比对，且**文件名不能变**（`next.config.ts` 的 `immutable` 缓存依赖「文件名不随内容改动」）。`wallpaper/bing/` 与 `wallpaper/nasa/` 是运行时镜像、只保留最近 7 天、不进仓库。
- `'use client'` 风格统一：`components/ui/Icon.tsx`、`charts/{BarList,Sparkline}.tsx`、`StatusBars.tsx`、`ConsoleSidebar.tsx`、`demos/types.tsx`、`LogDetailDrawer.tsx` 内部没有浏览器 API，指令可以去掉；但 `ConsoleClock`、`KpiCard`、`Reveal` 通过 `hooks/useUi` 间接依赖，且父级本来就是客户端边界，**去掉指令不改变打包结果**。当作可读性整理，不要写进性能指标。

### 已经查证过、不用再去追的两条

- `app/globals.css` 没有死类。扫出来「零引用」的 `.tok-*` / `.term` 是 `CodeWindow` 用 `tok-${kind}` 动态拼出来的（globals.css:466 的注释就写了这件事），删掉会直接毁掉代码窗配色。
- `scripts/make-thumbs.mjs` 依赖的 `sharp` **是可解析的**（`node_modules/sharp` 实存），`npm run thumbs` 能跑，不需要为它加声明依赖。

## 3. 反向清单：这些是刻意保留的，别当冗余清掉

| 保留项 | 位置 | 为什么 |
| --- | --- | --- |
| 可变状态挂 `globalThis` | `lib/server/{stats,board-cache,static-assets,catalog,upstream}.ts`、`store/kv.ts` 的内存后端、`store/config.ts` | Next 按 route 分包，模块级变量每个 chunk 一份，写入不跨路由传播（曾实测出「PATCH 写了、页面读到旧值」）。`createKvBackedConfig` 的水合与写路径都只**原地改**，谁把它换成整体重新赋值（`SETTINGS = parsed`），配置就只对当前 chunk 生效 |
| 可选依赖的动态 import 带忽略注释 | `lib/server/store/kv.ts` 的 `import('ioredis')` | 「构建期不装、运行时按需装」这个前提只有配了 `webpackIgnore` + `turbopackIgnore` 才成立：变量 specifier 会被常量折叠，Turbopack 照样把它当依赖解析（实测 `/` 直接 500） |
| 预检也走守卫链 | `lib/server/protection.ts` 的 `preflight()` | 它曾经是管线旁路：被拉黑的 IP 可以无限打预检，且不计频控与统计 |
| 上游失败冷却 | `lib/server/upstream.ts:15` | 没有它，上游宕机时每次页面加载都要等满 8 秒 |
| 公开接口的 `OPTIONS` 导出 | 19 个 `app/api/v1/*/route.ts` | 跨域调用方需要；`middleware` 的 matcher 刻意不含 `/api`，安全头由 handler 下发 |
| demos 走 `next/dynamic` | `components/plaza/demos/index.ts` | 十九个 demo 的取数与渲染代码不该进首屏，卡片进视口才挂载 |
| demo 共用 `useDemoFetch`，版式不共用 | `components/plaza/demos/types.tsx` | 11 处「seed 变了重取 + 丢弃过期响应」是同构的，收在一处；四张榜单卡的行结构各画各的（票房折万、时长折分秒、播放指数带千分位），共享版式要两个 render prop，第十一轮算过账不做 |
| `typedRoutes` + 生产构建继续 lint | `next.config.ts`、`tsconfig.json` | 路径写错在 `tsc` 阶段就报；质量门禁不能只在 CI 绿 |
| `import 'server-only'` | `lib/server/**`、`lib/auth/{jwt,session}.ts` | 客户端误引在构建期报错，而不是把密钥打进浏览器 |
| 规则只生效最具体的一条 | `lib/server/protection.ts` 的 `enforceAccessRules` | 叠加热量会让 global 规则把精确规则挤成摆设 |
| `limit` 可选且无默认 | `lib/zod/public.schema.ts` 的 `limitParam` | 给公开接口加默认 limit 会静默改变既有调用方拿到的结果 |
|  barrel 转发 | `lib/server/index.ts`、`components/ui/index.ts`、`types/index.ts` | 35 处、20 处、78 处真实引用走这里，不是摆设；第十轮收掉的是里面没人用的那几行，收窄的是符号而不是入口 |

## 4. 每轮改动的验收动作

顺序固定，全绿才算完成：

1. `npm run verify`（= typecheck → `eslint .` → `npm test`，当前 146 项）。它刻意不含 build，所以 dev server 在跑也能执行同一条命令。
2. `npm run build`，确认静态预渲染仍是 6 页（`/`、`/docs`、`/login`、`/plaza`、`/_not-found`、`/icon.svg`）、共享 JS 仍在 103 kB 附近；`/` 或 `/plaza` 变成 `ƒ` 就说明有人往根布局加了 Cookie / header 读取。**跑之前确认 3000 端口空着**：dev 与 build 共用 `.next`，撞过的现场是「`/` 500 且报 Client Manifest 找不到 `global-error.tsx`」这种和代码无关的红。
3. 起服务实测三件事，并把结果写回文案：公开成功信封与**失败信封同形**（`curl '.../api/v1/hotsearch?platform=nope'` 应看到 `data:null` + `meta.requestId` 且没有 `success`）、`requestId` 等于 `x-trace-id`、控制台日志页在打几次接口后出现真实记录。改过 `components/docs/**` 或车单时还要抽一页文档核对**页面里的唯一取值**（样例 `requestId`、语料数字）——生产服务吃的是构建产物，不重新 build 时 `/docs/<slug>` 会安静地给骨架页，200 不算通过。
4. 改过素材目录跑 `npm run thumbs`，否则 `tests/asset-thumb.test.ts` 会红。
5. 删一个字段就 grep 它的名字，确认 `types/`、`lib/zod/`、`store/`、页面表单、README 与文档页没有残留，本轮的多数「只存不用」就是这么挖出来的。收窄 `export` 时同样：`tsc` 零错误才算真的没人引用。

## 5. 两条纪律

- **不写没有实测过的数字。** 可用性百分比、平均响应、SLA 这类没有代码或测量支撑的值一律不进仓库（已清掉首页、一言文档与侧栏三处）。
- **UI 上出现的开关必须有 enforcement 或渲染消费方。** 加字段的同时写出「谁读它」；写不出就别加。这条来自 git log 里那条「安全页下架五项能改不生效的开关」，本轮的 `authRequired` / `rateLimited` 是它的最后一块。

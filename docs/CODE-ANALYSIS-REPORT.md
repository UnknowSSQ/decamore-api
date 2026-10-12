# Decamore API 代码项目端到端分析报告

> 分析范围：`app/`、`components/`、`lib/`、`hooks/`、`types/`、`constants/`、`utils/`、`tests/` 全量源码 + 构建/测试配置
> 分析方式：静态走读 + 依赖探查 + 质量门禁实测（`tsc` / `eslint` / `npm test`）+ 关键缺陷交叉验证
> 项目性质：对外公开 JSON 接口的站点 + 管理控制台（Next.js 15 App Router + React 19 + TS，无数据库，进程内状态）
>
> **本报告的处置状态已在 2026-10-10 逐条复核并就地标注**（〔已修〕〔已收紧〕〔已文档化〕〔仍开放〕）。复核方式是把每条结论拿去对代码与测试，不靠本报告的记忆：例如 D1 的 `7 * 3600` 已不存在于当前 `metrics.ts:14`，且 `tests/metrics.test.ts:140` 专门钉住它不许回退。

---

## 一、项目度量与质量门禁（实测）

| 指标 | 数值 |
| --- | --- |
| TS/TSX 文件数 | 293（其中 30 个测试文件） |
| 源码总行数 | 30,148；应用源码（不含 `tests/`）27,848 行，测试 2,300 行 |
| 文档模块行数 | `components/docs/apis/*` 6,140 行（廿一篇）+ `commonSections.ts` 496 行；行情与预警是第十八轮加的，公开接口 21 个 |
| 运行时依赖 | 8 个（jose / next / react / react-dom / zod / clsx / tailwind-merge / class-variance-authority），`ioredis` 为可选运行时依赖，构建期不装 |
| `tsc --noEmit` | **0 错误**（strict + noUncheckedIndexedAccess 全开） |
| `eslint .` | **0 问题** |
| `any` 用法（源码内） | **0 处** |
| 真实代码 TODO/FIXME | **0 处**（命中的 4 处都是 `TODO_CALLOUT`——`registry.ts:69` 定义、给未撰写接口生成骨架页时在 `params`/`response`/`headers` 三节各用一次，不是待办） |
| 测试套件 | 30 个文件、179 用例，全部通过、无需起服务；`npm run verify` 一条命令跑三道静态门禁，CI（`.github/workflows/ci.yml`）跑 verify 与生产构建两步 |

**结论先行**：这是一个工程纪律极强、文档与自审文化罕见成熟的成熟项目。问题不在"基础质量"，而在若干**正确性缺陷**与**架构性部署约束**。

---

## 二、架构分析

### 2.1 三层应用同仓
仓库同时跑三件事，但边界清晰：
- **公开接口**（21 个免鉴权 GET）：`app/api/v1/*/route.ts`，统一走 `defineRoute({ envelope: 'public' })`。
- **文档站**：`/docs` 与 `/docs/[slug]`，内容由 `components/docs/apis/<slug>.ts` 提供。
- **控制台**：`/admin/*`，读写进程内 store。

### 2.2 分层与依赖方向（健康）
```
app/(route/page) ──▶ lib/server（server-only 守护）
        │                ├── handler（请求管线）stats/metrics/store/board-cache/static-assets/upstream
        │                ├── auth（jwt/session/permissions）protection/response/validate/trace
        │                └── catalog/security-headers/errors/logger
        ├──▶ components/*（UI，'use client' 边界清晰）
        │         └──▶ hooks(useRequest/usePermission/useToast...) ──▶ lib/api(http/admin-api/endpoints)
        └──▶ constants/*（车单、权限、路由、默认频控）types/*（业务契约）utils/*（纯函数）
```
- `lib/server/index.ts`、`components/ui/index.ts`、`types/index.ts` 三个 barrel 仅为再导出，**无双向依赖滥用**。
- `server-only` 在所有 `lib/server/**` 与 `lib/auth/*` 顶部声明，客户端误引在**构建期**即报错——这是防密钥泄露的正确范式。
- `env/index.ts` 使用惰性 `getServerEnv()`，不在 import 期读密钥。

### 2.3 请求管线（设计亮点）
`middleware.ts`（Edge，仅 Cookie 存在性跳转 + 页面安全头 + 生成 x-request-id）→ `withApiHandler`：
`IP 黑白名单 → 维护模式（仅公开接口）→ 鉴权+权限 → CSRF 双提交 → Zod 校验 → 业务 → 统计记账（环形缓冲）→ 安全头/CORS/x-trace-id`。
异常统一在 `handleFailure` 收敛为同形信封，且统计在 try/finally 之外也补记，**失败路径不丢点**。

### 2.4 数据层与状态
无数据库。可变状态全部挂在 `globalThis` 上（`stats/board-cache/static-assets/catalog/upstream/store/*`），理由充分（Next 按 route 分包，模块级变量每 chunk 一份）。指标来自真实调用环形缓冲（容量 500）。

---

## 三、主要优点（值得保留的强项）

1. **类型与工程纪律顶级**：`strict` + `noUncheckedIndexedAccess` + 0 个 `any` + 0 lint 错误。下标越界在 `static-assets.ts`/`metrics.ts`/`rate-window.ts` 等处均做了非空保护（`picked[i]!`、`?? 0`、桶判空）。
2. **安全设计到位**：JWT HS256 且校验 `issuer/audience` 与 `typ`；Cookie `httpOnly`+`sameSite:'lax'`+生产 `secure`；CSRF 双提交（cookie 会话下写操作强制）；CORS 不开 credentials、origin 精确匹配；`resolveSafeRedirect` 防开放重定向；生产不回传 stack。
3. **"不编造假数据"的硬纪律**：日志/仪表盘/报表一律读真实环形缓冲；README 明令禁止写入未实测的 SLA/可用性/响应时间数字。这种诚实度在生产项目里很少见。
4. **自审文化**：`docs/REDUCTION-PLAN.md` 是团队级技术债务审计表（已砍七轮假数据/死码/重复，每条带 `文件:行` 与验收依据），`docs/API-TEMPLATE.md` 把"新增接口六处登记"固化成流程，并由 `catalog-sync.test.ts` 机器兜底一致性。第七轮又拿它反查自己：模板里「query 默认 `.strict()`」与实测相反（多余 query 参数是被忽略的，`.strict()` 只用在写接口的体上），已改正。
5. **性能优化扎实**：根布局不读 Cookie，`/`、`/plaza`、`/docs`、`/login` 等 6 页构建期静态预渲染（其余 41 条路由按需渲染）；资源按类型 immutable/短缓存+SWR；上游有 8s 超时 + 15s 失败冷却；`listAssets` 缓存 10min + single-flight 合并（非每次扫盘）。生产 TTFB 9–27ms。
6. **请求管线高度可测**：`enforcement.test.ts`（14 用例）直接驱动 `withApiHandler`+`protection`，覆盖黑白名单、规则 429/reject、默认限额、CORS、请求体上限——核心分支基本锁死。

---

## 四、主要缺点（按严重度）

### 高（正确性 / 信任）
- **D1 · 仪表盘"7天"实际只有 7 小时**〔已修〕：`lib/server/metrics.ts:14` 现为 `'7d': 7 * 24 * 3600`。当时担心的第二半也补上了——`tests/metrics.test.ts:140` 用「2 天前 / 8 天前」两条探针把窗口换算钉死，注释里写明「锁死 7*3600 回退 bug」，改回小时制立刻红。
- **D2 · 改密码接口是空操作却返回成功**〔已修〕：`app/api/v1/auth/password/route.ts` 现在按会话账号查表、`verifyPassword` 比对当前口令（错则 `401`）、`updatePassword` 重算哈希；`tests/users-store.test.ts` 覆盖「旧口令立刻失效」。
- **D3 · 明文口令**〔已修〕：`lib/server/store/users.ts` 只存 `scrypt$<salt>$<hash>`（Node 内置 `crypto.scrypt`，零新依赖），比对走 `timingSafeEqual`；`tests/users-store.test.ts:14` 还测了非法哈希格式返回 `false` 而不是抛错。演示明文只作为种子输入哈希一次。

### 中（架构约束 / 部署 / 可维护性）
- **D4 · 进程内单例不跨实例**〔部分处置〕：限流窗口计数与 `settings/security/rules` 已抽到 `lib/server/store/kv.ts`，`KV_BACKEND=redis` 时跨实例共享（`createKvWindowStore` 按 `floor(now / windowMs)` 分桶）。语义是**启动对齐 + 写传播**，不是实时读，README「跨实例状态」一节已写明；指标环形缓冲与只读缓存刻意留在进程内（见 `REDUCTION-PLAN` §2 P2）。
- **D5 · 长区间指标被 500 条环静默截断**〔已缓解〕：`metrics.ts:161` 产出 `sampledCapped`，`DashboardView.tsx:135` 在溢出时显示「N 条采样·内存环形缓冲已溢出，长区间仅覆盖最近保留的调用」，不再让人误读成全量。截断本身保留——落库换来的解释成本大于收益。
- **D6 · 客户端 IP 兜底塌缩**〔已文档化，行为未改〕：Route Handler 拿不到 socket，缺转发头时只能落到 `127.0.0.1`。现在 README 明写「反向代理必须转发 `x-forwarded-for` / `x-real-ip` / `cf-connecting-ip` 之一，否则全站共享一个计数桶」。没加逐请求 `logger.warn`：本地开发必然刷屏，而日志噪声的代价比这条提示的价值高。
- **D7 · 白名单网段过宽**〔已收紧〕：种子默认值改为 `ipWhitelist: []`、`ipBlacklist: []`（原先摆着两个 RFC 5737 文档地址，等于控制台显示「2 条黑名单」却谁也没挡住），`SECURITY_SEED_VERSION` 同步 bump。理由写在 `store/security.ts:16` 的注释里：豁免在 `handler.ts:123` 同时关掉频控与规则，叠加 D6 的兜底塌缩，宽网段等于全线免检。
- **D8 · 新增接口的"登记仪式"成本高**〔已收紧〕：六处登记是刻意的（少一处就「能跑但不能用」），但 `/api/v1/<name>` 的三处拷贝已在第十轮合成一处——车单与廿一篇文档模块都改成引用 `lib/api/endpoints.ts` 的 `API.publicApi.<id>`，新接口不必再把同一个路径打三遍（`REDUCTION-PLAN` §1.14）。
- **D9 · 数据层重复**〔大部分已处置〕：`loadCorpus()` 的两份逐字重复已收进 `lib/server/corpus.ts` 的 `createCorpusCache<T>({ slot, file, emptyMessage })`，榜单类继续用 `createBoardCache`。第十七轮又收掉两处同构样板：七个数据源各写的 `unavailable()` 工厂合成 `errors.ts` 的 `UpstreamUnavailableError(source, reason)`（现有 22 处抛点），`createBoardCache` 的 `toResult` 改成可省——七份逐字相同的「命中时铺开 `cached`」默认实现进了 `board-cache.ts`，只有要换返回形状的才自己写。各平台的 `FETCHERS` 与热度解析仍留在各文件，上游结构本来就不一样，强行模板化只会把差异塞进参数里。
- **D10 · 文档体积与手抄响应**〔体积已压，422 文案已单源，响应样例仍手抄〕：八节里七节的外壳上收到 `commonSections.ts` 的构建器，十篇 3,602 → 2,871 行（详见 `REDUCTION-PLAN` §1.8）；第七轮新增的四篇也全部走构建器，十九篇 5,383 行，到第十八轮的廿一篇 6,151 行（新增各篇同样只用构建器，没有新写外壳）。同一篇文档里 422 那句话出现四次（错误行、失败窗、`description`、`issues`），第十七轮改成从 `lib/zod/public.schema.ts` import 派生常量，zod 与文档共用一份——加 B 站平台时 README 的样例就漂过一回（仍写着四个平台）。第十八轮再把参数的合法值清单落成 `constants/*` 码表（`weather-cities` / `gold-contracts` / `stock-markets` / `warning-signals`），schema 的校验与提示、文档的取值行、数据源的时区与量纲都从它派生；但「微博 / 抖音 / …」这类散文式平台清单仍抄在车单、README 与文档三处，加平台时又漂过一次（记 `REDUCTION-PLAN` §2 的 P2）。手抄样例另有机器核对：`tests/doc-samples.test.ts` 要求语料类六篇的 200 样例能在 JSON 语料里逐字段命中——复核时正是它抓到 `hitokoto` 样例的半角逗号、丢掉的句末「。」和被截断的 `source`。

### 低（一致性 / 覆盖）
- **D11 · 测试覆盖缺口**〔大头已补，剩尾巴〕：已有 `http-client`（两种信封解析、重复键序列化、204）、`jwt`（签发验签往返、`typ` 错配、篡改、过期）、`users-store`、`auth-schema`、`corpus`、`kv`、`metrics`、`limit`（`limit` 不传保持全量）、`config-store`（配置单例引用不换）、`random`（抽 N 不重复）、`corpus-facts`（四份语料条数与字段不变量）、`doc-samples` / `doc-numbers` / `doc-422-hints` / `env-example`（文档与示例文件的一致性：200 样例能在语料里命中、文档里的数字与实现相等、十六处 422 文案等于 schema 产出的 message），`time`（上游墙上时间换 ISO：A 股紧凑位、港股斜杠与美股横杠、纽约夏令时、越界与未知时区给 null）。仍缺：`session.ts`（Cookie 头构造与 `resolveSession`）、`validate.ts`（数组展开与类型转换）、`hotsearch` 的上游解析（`parseHeatText`）、`admin.schema.ts`，以及 `http.ts` 的 401 续期单飞与超时重试——这两条需要 mock 计时器，成本明显高于前面几条。
- **D12 · 其他**〔不变〕：`auth:false` 路由不进 CSRF 双提交校验（refresh 仅轮换 cookie，注释已标风险低）；若干 `'use client'` 指令可去掉但不影响打包（纯可读性，`REDUCTION-PLAN` 已列）。

> 说明：扫描到的 73 处 `console.*` 里，55 处在文档模块**展示给用户看的 JS 示例代码片段**（如 `answerbook.ts:283` 在 template string 内）、8 处在 `scripts/check-env.ts`（CLI 输出，lint 已为脚本开例外），都不是运行时调试日志；运行时只剩 `logger.ts` 的输出实现、`env/index.ts` 的校验告警与 3 个 error 边界，合理。

---

## 五、优化清单的落地情况

原清单十四条，复核后分成两半；第六轮又按同一口径查出并处置了 O15–O23 九条（契约面宽于实现、store 三胞胎、乐观写两套、统计口径、表格可访问性、`offline` 死值、没有 CI、抽屉副本）。**已落地的**只留「靠什么防回退」；**没做的**保留原判断，其中几条在 `docs/REDUCTION-PLAN.md` 里有更细的账，这里指过去而不是再写一遍。第七轮（四个语料接口）的账在 `REDUCTION-PLAN` §1.11：四个接口全按模板落地并 curl 实测，反查出模板两处口径与实测相反（query 不 strict、路由骨架示例还写路径字面量），已改正；本报告 O12 里「strict 拒参已被测试」那句一并修正——public query schema 从来不上 `.strict()`，多余 query 参数是被忽略的。

### 已落地

| 项 | 落点 | 防回退 |
|---|---|---|
| O1 · `7d` 窗口换算 | `lib/server/metrics.ts:14` | `tests/metrics.test.ts:140` 的双探针（2 天前 / 8 天前）+ `sampledCapped` 断言 |
| O2 · 改密不再空操作 | `app/api/v1/auth/password/route.ts` | `tests/users-store.test.ts` 的「旧口令立刻失效」；`tests/auth-schema.test.ts` 的口令强度与 strict |
| O3 · 口令 scrypt 哈希 | `lib/server/store/users.ts` | 同上，外加非法哈希格式返回 `false` 的用例（`users-store.test.ts:14`） |
| O4 · 多实例边界 | `lib/server/store/kv.ts` + `createKvWindowStore`；README 与 `REDUCTION-PLAN` §2 P2 各写清了自己的语义 | `tests/kv.test.ts`（跨实例累加、内存有界） |
| O5 · 截断要在 UI 说清 | `metrics.ts:161` 的 `sampledCapped` → `DashboardView.tsx:135` | 指标用例断言 7d 截断为 `true`、30d 为 `false` |
| O7 · 白名单种子收紧 | `store/security.ts` 默认 `[]`（黑名单也去掉演示 IP） | `SECURITY_SEED_VERSION` bump；`tests/enforcement.test.ts` 继续按显式 patch 测豁免语义 |
| O8 · 语料读取消重 | `lib/server/corpus.ts` 的 `createCorpusCache`（一言与答案书各自只剩这一段声明式调用） | `tests/corpus.test.ts`（并发首请求共享一次读盘、空语料报错后可重试） |
| O9 · 文档骨架上收 | `commonSections.ts` 的七个分节构建器 + 行常量 + `successPane`/`failurePane`；十篇 3,602 → 2,871 行（第七轮新增四篇、第十三轮再加一篇同样走构建器，第十八轮廿一篇现 6,151 行）。第十七轮再把每篇四处的 422 文案改成 import `public.schema.ts` 的派生常量，十二篇共 48 处引用一份文案 | 逐字节快照 oracle（方法见 `REDUCTION-PLAN` §1.8）+ `tests/doc-numbers.test.ts`、`tests/doc-samples.test.ts`（语料类六篇）、`tests/doc-422-hints.test.ts`（十六处 422 文案与 schema 相等） |
| O15 · 契约面宽于实现（第六轮查出并收到实现那么大） | `lib/api/error.ts` 删 6 个无人读成员（72 → 48 行）；`hooks/usePermission.ts` 51 → 9 行只留 `useCan`；`useAuth` 删 `hydrated` 状态管线与六个没人读的 context 字段（238 → 201 行）；`constants/auth.ts` 删 `PERMISSION_LABELS`；`lib/server/guards.ts` 删无人传参的 `permission`/`anyPermission`/`roles` 与 `denied` 分支（43 → 29 行） | `tsc` + `eslint`（删完 `status` 立刻被报「只写不用」，说明整条状态机确实没有读方）；`LoginForm` 改 typed 读 `RequestError.issues`，字段名写错编译器会响 |
| O16 · 报障编号终于可见 | `useRequest.ts:75` 把 `traceId` 拼进错误 toast（「… · 编号 mv2c7ba2-…」），此前文档一直叫用户「带 requestId 来报障」，控制台里没有任何地方显示它 | 属显示层，无自动化断言；改动时看 `lib/api/http.ts:187` 那个采集点是否仍在 |
| O17 · store 三胞胎合成一个外壳 + 修掉水合换引用 | `lib/server/store/config.ts` 的 `createKvBackedConfig` / `replaceInPlace`；三份 288 → 223 行 + 90 行共享实现。原水合是 `SETTINGS = parsed` 整体换引用，与「写路径原地 `Object.assign` 才跨 chunk 可见」这条约定相反 | `tests/config-store.test.ts` 5 个用例（引用不换、外部缺键要清、同版本第二次拿同一对象、bump 会重播、memory 后端 `mirror()` 空操作） |
| O18 · 乐观写只剩一条路 | `SecurityView.tsx`（431 → 410 行）四个列表 handler 改走同一个 `commit(next, write, messages)`；`useOptimisticToggle` 的 `persist` 类型收紧为 `Promise<TRow>` 并用服务端那一行覆盖本地行 | 类型收窄后调用点若还按 `Promise<unknown>` 写会编译不过 |
| O19 · 统计作用域标出来 | `StatusBars` 标题改「本页状态码分布」并在文件头写明它与上方按筛选算的汇总卡不同口径；`RulesView` 把生效数与今日命中一起归到「本页 N 条」；`LogsView` 四个汇总卡失败/未返回时显示「—」而不是 `0` | 文案层，靠 review；`metrics.test.ts` 已锁 summary 是筛选口径而非当前页 |
| O20 · 表格与下拉可访问性 | `DataTable`：`<th scope="col">`（此前全仓 `scope=` 零命中）、可排序列 `aria-sort`、可点行加 `tabIndex` + Enter/空格激活（焦点环走 `globals.css:126`）；三个筛选 `<select>` 补 `aria-label` | 无自动化断言；`typedRoutes` 与 jsx-a11y 都没开，这类只能人查 |
| O21 · `offline` 这个到不了的取值删掉 | `types/domain.ts`、`lib/zod/admin.schema.ts` 两处 enum、`ApisView` 筛选项同步收窄为 `online` / `degraded`：开关写不出第三值，那个筛选项永远返回空列表 | `tsc` 会指出任何残留分支 |
| O22 · 门禁不再只靠人记得 | `npm run verify`（typecheck + lint + test，**刻意不含 build**，因为 dev 与 build 共用 `.next`）+ `.github/workflows/ci.yml`（verify 与生产构建两步，构建步骤带仅供构建的占位密钥） | workflow 本身就是门禁；`tests/env-example.test.ts` 用 `ENV_KEYS` 与 `.env.example` 双向比对，示例文件缺键或留废键都会红 |
| O23 · 抽屉不再持有一行的副本 | `ApisView` / `RulesView` 的 `drawerApi` / `drawerRule` 改成只存 `drawerId` + 从 `data.items` 里 `useMemo` 取行；此前抽屉显示的是打开那一刻的对象，行内开关切完、列表刷好了，抽屉还停在旧形状 | 类型层：`useState<ManagedApi | null>` 换成 `useState<string | null>`，任何想再存副本的写法都要显式改类型；删除确认框保留副本是刻意的（行删掉后还要显示名字） |
| O25 · 冷回源才是这些接口的耗时主体（第十九轮） | 热路径服务端只要 0.12–0.45ms（`/api/v1/*` 命中缓存时），冷取才是问题：预警原先串行翻两页要 11.3 秒，改成读 `totalPage` 后剩余页 `Promise.allSettled` 并发 → 2.7–5.5 秒；`parseWallClock` 的 `Intl.DateTimeFormat` 改为按时区缓存复用（实测单次 0.057ms → 0.008ms，668 条省 ~40ms）；网易云那两个只依赖 songId 的查询由串行改并行（实测差异在噪声内，评论那一趟占大头） | 全量 34 条路径逐一取样（冷 / 热各三次）；`tests/time.test.ts` 锁住换算行为，改动不改变出参 |
| O24 · 出口侧也要有闸（第十九轮） | `utils/upstream-gate.ts`：每个上游主机最多 6 个在途，第 7 个排队最多 1 秒，等不到就抛「上游并发已满」由数据源换成 503。补的是那三道按来源 IP 计的桶（`global|ip`、`default|ip|method|route`、`rule|id|ip`）之外的空档——多来源合计从来没被约束过，而 `x-forwarded-for` 可伪造意味着「多来源」不需要真有多个来源。接线在 `lib/server/upstream.ts` 的 `upstreamBytes`（所有回源的必经路），名额释放走交接不动计数 | `tests/upstream-gate.test.ts` 三条（排队不立刻失败、等满 1 秒抛且不占名额、按主机分闸）；生产实测 24 并发 p50 从 48ms（单发）到 102ms，说明出口被压成 6 路 |
| O26 · 过期不再让请求去等上游（第二十轮） | `lib/server/board-cache.ts`：TTL 过后先回上一份并照标 `cached=true`，刷新交给后台那一路；兜底窗口是「一个 TTL，短榜不少于 10 分钟」（第一版按 10 倍 TTL 写，量下来对一小时那两类会供到十小时前的牌价，故改）。后台失败退避 15 秒、继续供旧数据并记一条 `board.refresh`；缓存键封顶 64 个，超出淘汰最久没刷新的（`typhoon?id=` 一条路径 31KB）。`cached` 的语义随之改变，九篇文档那一行收成 `commonSections.ts` 的 `cachedRow(ttl)` | `tests/board-cache.test.ts` 九条（兜底窗口内先回旧数据并后台刷一次、失败退避期内不再撞上游、短 TTL 兜到 10 分钟、长 TTL 只宽限一个周期、超出窗口回阻塞、键数封顶）；生产实测预警：冷 1,617.54ms → 命中 1.81ms → **过期那一枪 3.04ms 且仍是旧 `updatedAt`** → 8 秒后 1.85ms 拿到刷好的 660 条 |
| O27 · JSON 出网前压掉十二倍（第二十轮） | `next start` 的自带压缩只覆盖页面，Route Handler 原样出网——实测同进程 `/` 有 `Content-Encoding: gzip`，而 `/api/v1/warning` 在客户端声明 `Accept-Encoding: gzip` 时仍发 262,245 字节。`lib/server/compress.ts`（39 行）补在 `withApiHandler` 出口，成功与失败两条路都过；门槛 1,024 字节，非 JSON、带 `Set-Cookie`、已有 `Content-Encoding` 的一律不碰 | `tests/compress.test.ts` 五条（头与体、阈值下不压、非 JSON 不压、带 cookie 不重建、真实公开路由出网已压）；生产实测 预警 264,193 → 21,022 字节、热搜 11,947 → 4,137、票房榜 15,500 → 3,367；浏览器页内 `fetch` 复核解压与字段正常。注意 `recordApiCall` 在压缩前记账，日志 `durationMs` 不含压缩耗时 |

### 仍待办

- **O6 · IP 解析与白名单**：白名单种子已清空（D7），**转发头缺失只做文档说明、没有运行期提示**（D6）。要再加东西，加在部署文档而不是逐请求日志。
- **O7 的另一半 · 路径字面量单一来源**〔已收〕：`/api/v1/<id>` 现在只住在 `lib/api/endpoints.ts`，`constants/api-catalog.ts` 的 14 个 `path` 与 14 篇文档模块的 `const path` 都改成引用；`catalog-sync.test.ts` 的断言留着，角色从「兜住三处漂移」变成「验证 endpoints 自己没写错」。
- **O10 · `http.ts` 的续期与重试**：两种信封解析、重复键序列化、204 已有用例；401 续期单飞与超时重试仍缺，需要 mock 计时器。
- **O11 · `session.ts`**：签发/验签那一半已由 `tests/jwt.test.ts` 覆盖（`typ` 错配、篡改、过期）；Cookie 头构造与 `resolveSession` 仍未测（全仓没有 import `session` 的用例）。
- **O12 · `validate.ts` 与 `admin.schema.ts`**：`public.schema` 的 `limit` 全量语义、空串等价不传与边界已有（`tests/limit.test.ts`）；第七轮又补了 `random`（抽 N 不重复）与 `corpus-facts`（四份语料的条数与字段不变量）。仍缺：`validate.ts` 的数组展开/类型转换、`admin.schema.ts`、`hotsearch.ts` 的 `parseHeatText`。
- **O13 · refresh 的 CSRF 边界**：不变，`auth:false` 路由仍不进双提交校验，注释已标风险低。
- **O14 · `'use client'` 边界整理**：不变，纯可读性，`REDUCTION-PLAN` §2 P3 已注明不要计入性能指标。

---

## 六、总体评价

**强项**：在同体量项目中罕见地把"类型安全、安全设计、诚实数据、自审文档"四件事同时做到了位。`tsc`/`eslint`/测试三道门禁全绿，请求管线统一可测，`server-only` 把密钥泄露风险挡在构建期，这些是该项目的"护城河"。

**短板**：原先列出的两点，第一点已经清零——三个正确性缺陷（`7d` 换算、改密空操作、明文口令）都改完并有用例钉住，不会再靠人记得。剩下的是第二点，**架构级取舍而不是缺陷**：无数据库 + 进程内状态。它现在的处置是把「必须跨实例正确」的（配置、限流计数）交给可选的 Redis 层，把「本进程看见了什么」的观测数据刻意留在内存，两边语义都写进了 README 与 `REDUCTION-PLAN`。多实例部署仍然要么配 Redis、要么接受观测数据按实例切分，这个决策没有第三种不收代价的做法。

**建议落地顺序**：本报告的可执行项已并成两条线，不再另开第三份清单——结构性减负与「下一步砍什么」看 `docs/REDUCTION-PLAN.md` §2，新增接口与文档怎么写看 `docs/API-TEMPLATE.md`。剩下的测试尾巴（O10 续期与重试、O11 `session.ts`、O12 `validate.ts` 与 `admin.schema.ts`）是唯一还没有归属的一组，按「先前端关键路径、再解析分支」的顺序补。

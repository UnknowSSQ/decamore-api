/** 对外接口的返回形状与控制台视图模型；字段名即接口契约，改动会影响 /docs 页面与 Live 卡片 */
import type { FieldIssue, Paged } from './api';

/** 方法与作用域分类的唯一真值：Zod 校验、车单、表单选项都从这里派生，不再各写一份字面量 */
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export const API_CATEGORIES = ['内容', '图片', '数据'] as const;
export type ApiCategory = (typeof API_CATEGORIES)[number];

export interface ApiCatalogItem {
  id: string;
  name: string;
  en: string;
  path: string;
  cat: ApiCategory;
  method: HttpMethod;
  desc: string;
  /** 空格分隔，含拼音，供 utils/search 加权 */
  kw: string;
  hint: string;
  /** 后台新建的接口没有 demo */
  demo: DemoKind | null;
}

export interface AnswerBookEntry {
  chinese: string;
  english: string;
}

/**
 * 古诗词：语料 public/assets/json/poems.json 共 300 首，唐 150 / 宋 150。
 * 语料自带的 number / volume / displayLines / originalEye 四个字段没有能对外的说法（卷次是上游分组序号，
 * 诗眼与 answer 在部分条目上不一致），所以不进契约，别在文档里替它们编含义。
 */
export interface Poem {
  /** 语料内稳定编号 p001–p300 */
  id: string;
  title: string;
  author: string;
  /** 粗分朝代，只有唐与宋；query 参数取它的 ASCII 写法 */
  dynasty: PoemDynasty;
  /** 细分朝代，实测四种：唐、南唐、北宋、南宋。南唐在语料里记作宋 */
  era: string;
  /** 体裁与词牌混放，实测 82 种，如「五言律诗」「虞美人」 */
  genre: string;
  /** 全文按句切分，实测 2–60 行 */
  lines: string[];
  /** 常被单独引用的一句；语料里有 20 首不与 lines 逐字重合（跨行断句所致） */
  quote: string;
  /** 白话译文 */
  meaning: string;
  /** 语料配的现代语境一句话，给分享场景用 */
  realLife: string;
  tags: string[];
  blank: PoemBlank;
}

/** 填字小题目：名句里挑一个字当空，前端把 index 那一格遮起来即可 */
interface PoemBlank {
  /** 完整的一句，index 处正是 answer（300 首全测过，没有例外） */
  prompt: string;
  /** 候选字，实测固定 5 个且不重复，必含 answer */
  options: string[];
  /** options 里正确的那一个字 */
  answer: string;
  /** 空位在 prompt 里的下标，实测 0–8 */
  index: number;
}

export type PoemDynasty = '唐' | '宋';
/** dynasty 参数的取值：URL 里不出现汉字 */
export type PoemDynastyParam = 'tang' | 'song';

/** 毒鸡汤：语料 public/assets/json/soul.json 共 2,020 条，正文实测 3–112 字 */
export interface SoulLine {
  /** 语料内序号，1–2020 且唯一 */
  id: number;
  content: string;
}

/** 疯狂星期四文案：语料 public/assets/json/kfc.json 共 424 条纯文本 */
export interface KfcCopy {
  content: string;
}

/** 成语：语料 public/assets/json/ChengYu.json 共 50,373 条，每条只有成语本身（实测字数 4–8） */
export interface IdiomList {
  /** 语料全量条数，固定 50,373；不随 chars 筛选变化 */
  total: number;
  /** 本次随机到的成语，条数由 limit 决定 */
  items: string[];
}

export type WallpaperType = 'pc' | 'mobile' | 'bing' | 'nasa';

/** 四类来源统一形状：本类型没有的字段一律为 null，而不是省略键 */
export interface WallpaperItem {
  /** 不传 type 时由服务端在四类中等概率随机选定 */
  type: WallpaperType;
  url: string;
  /** 体积远小于原图，供列表与卡片预览：pc / mobile 是同名 .webp，bing 与 nasa 是 640×480 的 .jpg */
  thumb: string;
  id: string;
  /** 读不出图像头时为 null */
  width: number | null;
  height: number | null;
  /** 以下三项只有 bing / nasa 有值 */
  title: string | null;
  copyright: string | null;
  date: string | null;
}

export type HotSearchPlatform = 'weibo' | 'douyin' | 'baidu' | 'zhihu' | 'bilibili' | 'toutiao';

export interface HotSearchItem {
  rank: number;
  title: string;
  /** 上游只给展示文案时按「万 / 亿」换算，换算不出为 null */
  heat: number | null;
  /** 知乎这类不给数值的平台走这里 */
  heatLabel: string | null;
  url: string;
}

export interface HotSearchResult {
  platform: HotSearchPlatform;
  /** 上游不给时间的平台，这里是服务端抓取时刻 */
  updatedAt: string;
  cached: boolean;
  items: HotSearchItem[];
}

export type HotMusicPlatform = 'qq' | 'netease' | 'kugou';

export interface HotMusicItem {
  rank: number;
  title: string;
  /** 多歌手用「/」连接 */
  artists: string;
  /** 酷狗没有可靠的专辑字段，恒为 null */
  album: string | null;
  /** 秒；网易云上游给毫秒，已在服务端换算 */
  duration: number | null;
  url: string;
}

export interface HotMusicResult {
  platform: HotMusicPlatform;
  /** 上游自己的榜名 */
  chartName: string;
  updatedAt: string;
  cached: boolean;
  items: HotMusicItem[];
}

/** 对应上游 channel_type：1 电视剧 / 2 综艺 / 3 电影 */
export type HotPlayType = 'tv' | 'movie' | 'variety';

export interface HotPlayItem {
  rank: number;
  title: string;
  category: string | null;
  /** 大屏播放指数（上游 playRate），不是网络热度 */
  heat: number | null;
  score: number | null;
  /** 平台原名照抄上游，可能多个 */
  platforms: string[];
}

export interface HotPlayResult {
  type: HotPlayType;
  /** 上游出榜滞后，不保证是今天 */
  boardDate: string;
  /** 由 boardDate 换算，上游只给到日期 */
  updatedAt: string;
  cached: boolean;
  items: HotPlayItem[];
}

/** 上游没有评分字段，这里不造 */
export interface HotChartItem {
  rank: number;
  title: string;
  releaseInfo: string | null;
  /** 元；上游单位是分，已除以 100 */
  boxOffice: number | null;
  boxOfficeText: string | null;
  boxRate: string | null;
  /** 给人看的字符串（如「1.89亿」），不能拿去做算术 */
  totalBoxOffice: string | null;
  showCount: number | null;
  seatRate: string | null;
  viewPerShow: string | null;
}

export interface HotChartResult {
  updateTime: string;
  cached: boolean;
  items: HotChartItem[];
}

/**
 * 网易云热评：一首随机歌配它自己的一条热评。
 * 歌曲与评论来自两次上游请求，所以字段是两边各取一半——评论侧没有歌曲信息。
 */
export interface NeteaseComment {
  /** 命中的歌曲 id，可直接拼进 music.163.com/song?id= */
  songId: number;
  song: string;
  /** 第一歌手；一首歌可能有多位，上游 artists 是数组 */
  artist: string;
  /** 专辑封面直链：实测 108 次全是 https，域名在 p1/p2 之间换 */
  cover: string;
  comment: string;
  nickname: string;
  /** 评论者头像：实测 36 次全是 http，https 页面里直接引用算混合内容 */
  avatar: string;
  /** 该条评论的点赞数，实测 12 到 86,036 都有 */
  likedCount: number;
  /** 上游算好的时间串，形态不固定：「7天前」「09-26」「2025-04-16」都见过 */
  timeLabel: string;
  /** 本次抽歌用的歌单 id */
  playlistId: number;
  /** 这首歌的评论总数（不是热评条数），实测 198 到 435,764 */
  commentTotal: number;
}

/** 台风编号与中文名等身份信息；路径点要另发一次 ?id= 取 */
export interface TyphoonBrief {
  /** 上游的内部 id，取路径就传它，实测如 3346033 */
  id: number;
  /** 国际编号，如 2629；无名热带低压这里是 20260027 这种长号 */
  code: string;
  /** 国际命名，未命名时上游给字面量 nameless */
  name: string;
  /** 中文名，上游串里带换行符（「小熊\n」），已 trim */
  cname: string;
  /** 名字含义，如「一种鹰」；无名热带低压为 null */
  meaning: string | null;
  /** start 在架、stop 已停编 */
  active: boolean;
}

export interface TyphoonResult {
  /** 当前仍在架的台风；台风季外是空数组，不是 null */
  active: TyphoonBrief[];
  /** 上游列表里的全部台风，按编号从新到旧 */
  list: TyphoonBrief[];
  cached: boolean;
}

/** 单个时次的路径点；中心位置在西北太平洋上，经纬度都是东经 / 北纬 */
export interface TyphoonTrackPoint {
  /** 该时次的时刻，由上游给的时间戳转 ISO；实测与上游那个 12 位标签逐位相同，标签本身不带时区 */
  time: string;
  /** 强度原文，大小写不统一：TD / TS / STS / TY / STY / SuperTY */
  strength: string;
  /** 中文档名，认不出来的强度原样回 null */
  strengthLabel: string | null;
  lon: number;
  lat: number;
  /** 中心气压，百帕 */
  pressure: number | null;
  /** 最大风速，米 / 秒 */
  windSpeed: number | null;
  /** 移动方向，如 NNW */
  direction: string | null;
  /** 移动速度，公里 / 小时 */
  moveSpeed: number | null;
}

export interface TyphoonTrack {
  id: number;
  name: string;
  cname: string;
  code: string;
  active: boolean;
  /** 起报时到最新观测的全部时次，实测 51 个点 */
  points: TyphoonTrackPoint[];
  cached: boolean;
}

/** 人民币汇率中间价一行；官方每天早上 9:15 发布，节假日不更新 */
export interface ExchangeRate {
  /** 币对原文，如「美元/人民币」 */
  name: string;
  /** 国际写法，如 USD/CNY；方向以它为准，人民币在前的是 CNY/THB */
  pair: string;
  /** 外币代码，人民币在前的那些是 THB / MOP 等 */
  currency: string;
  /** 1 单位（或 pair 里写明的 100 单位）前项 = price 后项；实测 CNY/KRW 是 200.18，即 1 元约 200 韩元 */
  price: number;
  /** 较前一交易日的变动，单位「点」，1 点 = 0.0001；负数是贬值方向。上游另有一列无符号绝对值，我们取带符号这个 */
  change: number | null;
}

export interface ExchangeRateResult {
  /** 这份中间价的发布日期，YYYY-MM-DD */
  date: string;
  /** 实测 25 个币对 */
  rates: ExchangeRate[];
  cached: boolean;
}

/** 中国天气网的城区实况，一次一个城市 */
export interface WeatherNow {
  /** 本站参数用的拼音键 */
  key: string;
  /** 上游的中文城市名 */
  city: string;
  /** 上游的 9 位城市码，如 101010100 */
  code: string;
  /** 摄氏度，实测一位小数（25.5）也有整数（27） */
  temp: number | null;
  /** 华氏度 */
  tempf: number | null;
  /** 天气现象中文，如「霾」「多云」 */
  weather: string;
  /** 天气现象英文，如 Light haze */
  weatherEn: string;
  /** 风向中文，如 南风 */
  windDir: string;
  /** 风向英文单字，如 S */
  windDirEn: string;
  /** 风力原文「2级」，上游就不给纯数值 */
  windPower: string;
  /** 风速原文「5km/h」 */
  windSpeed: string;
  /** 相对湿度，百分数字符串「41%」 */
  humidity: string;
  /** 气压百帕 */
  pressure: number | null;
  /** 能见度，上游给「6km」或「暂无实况」 */
  visibility: string;
  /** 今日空气质量指数 */
  aqi: number | null;
  /** 降水，实测多为 "0" */
  rain: string;
  /** 观测时刻 HH:MM，是北京时间，不带日期 */
  time: string;
  /** 上游自己给的日期串，形如「10月11日(星期日)」 */
  dateLabel: string;
  /** 尾号限行提示，如「不限行」 */
  limitNumber: string;
  cached: boolean;
}

/** 上海黄金交易所的一个合约快照 */
export interface GoldQuote {
  /** 合约代码，如 Au99.99 */
  contract: string;
  /** 计价单位：黄金是元 / 克，Ag99.99 是元 / 千克 */
  unit: string;
  /** 最新价，取分时序列末点，实测 898.0 到 14708.0 这个量级 */
  price: number;
  /** 今日开盘，取分时序列首点；夜盘合约的首点是前一天 20:00 */
  open: number;
  high: number;
  low: number;
  /** 当日分时点数，实测 782（20:00 起每 2 分钟一点） */
  points: number;
  /** 上游标注的最新分时时刻，HH:MM */
  asOf: string;
  /** 上游 delaystr，北京时间「2026年10月12日 02:29:53」转成的 ISO */
  updatedAt: string | null;
  cached: boolean;
}

/**
 * 行情按市场族取位序：A 股 / 指数 / ETF / 北交所是 88（或 87）段，港股 78 段，美股 73 段，
 * 同一个下标在三种布局里含义不同（第 46 段 A 股是市净率、港美是英文名），所以逐字段映射而非共用一张表。
 */
export type StockMarket = 'sh' | 'sz' | 'bj' | 'hk' | 'us';

export interface StockQuote {
  /** 请求里的写法，如 sh600519 */
  code: string;
  market: StockMarket;
  /** 中文名（美股给中文译名，如「苹果」） */
  name: string;
  /** 交易所侧的代码原文：A 股 600519、港股 00700、美股 AAPL.OQ、指数 000001 */
  symbol: string;
  price: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  change: number;
  /** 百分数本身，-1.11 表示跌 1.11% */
  changePercent: number;
  /** 统一成「股」：A 股上游给手，已乘 100 */
  volume: number;
  /** 统一成「元」：A 股上游给万元，已乘 10000 */
  amount: number;
  /** 换手率百分数 */
  turnoverRate: number | null;
  /** 市盈率，指数也给（上证 16.59）；上游给 0 就当 0 */
  peRatio: number | null;
  /** 当日振幅百分数 */
  amplitude: number | null;
  /** 流通市值，单位亿元 */
  floatMarketCap: number | null;
  /** 总市值，单位亿元 */
  totalMarketCap: number | null;
  /** 涨跌停价：只有 A 股个股有，指数上游给 -1，这里归成 null */
  limitUp: number | null;
  limitDown: number | null;
  week52High: number | null;
  week52Low: number | null;
  /** CNY / HKD / USD */
  currency: string;
  /** 上游品种标记：GP-A 个股、ZS 指数、ETF、GP 其它市场个股 */
  kind: string;
  /** 上游时刻原文，A 股 20261009161459、港美 2026-10-09 16:08:14，都不带时区 */
  quoteTime: string;
  /** 按交易所所在时区换算的 ISO；解不出来为 null */
  quotedAt: string | null;
}

export interface StockBoard {
  /** 服务端抓取时刻 */
  updatedAt: string;
  /** 本次请求的代码数，与 items 条数不等时说明有代码查无行情 */
  requested: number;
  count: number;
  items: StockQuote[];
}

/** 预警的参数键：URL 里不出现汉字，服务端按 constants/warning-signals.ts 翻成上游认的中文值 */
export type WarningSignalType =
  | 'typhoon'
  | 'rainstorm'
  | 'snowstorm'
  | 'coldwave'
  | 'gale'
  | 'duststorm'
  | 'hightemp'
  | 'drought'
  | 'thunder'
  | 'hail'
  | 'frost'
  | 'fog'
  | 'roadice';

export type WarningLevel = 'blue' | 'yellow' | 'orange' | 'red';

/** 一条预警信号；上游的列表项只有五个字段，类型与等级是从标题解析的 */
export interface WeatherWarning {
  /** 上游 alertid，形如 62062341600000_20261011202130，前段是区划码、后段是签发时刻 */
  alertId: string;
  title: string;
  /** 发布单位全称，如「江苏省镇江市气象台」 */
  issuer: string;
  /** 按标题前缀归到的省级键（与 region 参数同一套取值），归不出为 null */
  region: string | null;
  /** 标题里解析不出十三类之一时为 null */
  signalType: WarningSignalType | null;
  /** 标题里的颜色，解析不出为 null */
  level: WarningLevel | null;
  /** 图标直链，随类型与等级不同 */
  icon: string;
  /** 上游详情页绝对直链 */
  url: string;
  /** 上游 issuetime「2026/10/11 20:21」是北京时间，转成 ISO */
  issuedAt: string | null;
}

/** 四色各多少条 */
export type WarningLevelCount = Record<WarningLevel, number>;

export interface WarningBoard {
  /** 抓取时刻 */
  updatedAt: string;
  cached: boolean;
  /** 上游 data.page.count，在架总数 */
  upstreamTotal: number;
  /** true 表示上游还有条目没取回（本接口最多取三页，一页实测 200 条上限） */
  truncated: boolean;
  /** 本次筛选命中的条数，在 limit 截断之前 */
  matched: number;
  /** 命中条目里四色各多少 */
  levelCount: WarningLevelCount;
  items: WeatherWarning[];
}

/** 取值即 public/assets/<类别> 下的目录名，加目录要同步这里的字面量 */
export type EmojiType = 'menhera';
export type AvatarType = 'boy' | 'girl' | 'anime';
export type ImageType = 'beauty' | 'pretty';

export interface StaticAssetItem {
  /** 文件名去扩展名，可当缓存键 */
  id: string;
  file: string;
  format: string;
  /** 字节数；扫描时取不到为 null */
  size: number | null;
  url: string;
  /** 派生 webp 缩略图，宽度按类别不同（头像 224、表情与图片 448），目录里没有对应文件时不下发该字段 */
  thumbUrl?: string;
}

export interface StaticAssetList<TType extends string = string> {
  type: TType;
  total: number;
  cached: boolean;
  items: StaticAssetItem[];
}

export type EmojiListResult = StaticAssetList<EmojiType>;
export type AvatarListResult = StaticAssetList<AvatarType>;
export type ImageListResult = StaticAssetList<ImageType>;

/** 新增 demo 要同时在 components/plaza/demos/index.ts 注册 */
export type DemoKind =
  | 'quote'
  | 'answerbook'
  | 'wallpaper'
  | 'hot'
  | 'music'
  | 'play'
  | 'chart'
  | 'emoji'
  | 'avatar'
  | 'image'
  | 'poetry'
  | 'idioms'
  | 'soulsoup'
  | 'kfc'
  | 'netease'
  | 'typhoon'
  | 'exchange'
  | 'weather'
  | 'gold'
  | 'stock'
  | 'warning';

interface PublicApiMeta {
  /** 与响应头 x-trace-id 同值 */
  requestId: string;
  serverTime: string;
  site: string;
}

/**
 * 公开接口只认这一种结构，成功与失败同形：失败时 data 为 null、statusCode 即 HTTP 码。
 * description / issues 只在失败时出现，供调用方定位参数问题。
 */
export interface PublicApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
  meta: PublicApiMeta;
  description?: string;
  issues?: FieldIssue[];
}

export interface HitokotoLine {
  content: string;
  creator: string;
  source: string;
}

/** id 与接口车单同源，改一处广场与文档同步生效；指标列仍是 mock 派生值 */
export interface ManagedApi {
  id: string;
  path: string;
  name: string;
  description: string;
  method: HttpMethod;
  category: ApiCategory;
  calls24h: number;
  avgLatencyMs: number;
  errorRate: number;
  /** 后台只有「上线 / 转入维护」一个开关，写不出第三种值，所以这里不留 offline */
  status: 'online' | 'degraded';
  updatedAt: string;
}

export interface AccessRule {
  id: string;
  name: string;
  scope: string;
  /** 每 periodSec 秒内最多 limit 次 */
  limit: number;
  periodSec: number;
  action: '429' | 'reject' | 'log';
  enabled: boolean;
  hitsToday: number;
  updatedAt: string;
}

/** 与筛选同口径、翻页之前的汇总：KPI 四个格子与表格说的是同一批记录 */
export interface LogSummary {
  total: number;
  errors: number;
  blocked: number;
  avgLatencyMs: number;
  cacheHitRate: number;
}

/** 日志页的一页数据加上与筛选同口径的汇总 */
export interface CallLogPage extends Paged<CallLog> {
  summary: LogSummary;
}

/** 一条真实调用记录，字段与 lib/server/stats 的 ApiCallRecord 对齐 */
export interface CallLog {
  /** 即 traceId，可直接拿去查服务端日志 */
  id: string;
  time: string;
  path: string;
  method: HttpMethod;
  status: number;
  latencyMs: number;
  ip: string;
  /** 会话里的用户 id，公开接口为 anonymous */
  caller: string;
  ua: string;
  /** 出自服务端缓存为 true；该接口没有缓存语义时为 undefined */
  cacheHit?: boolean;
}

/** POST /api/v1/dashboard/export：报表内容随信封回，前端用 Blob 落地成文件 */
export interface ExportReportResult {
  fileName: string;
  format: 'csv' | 'json';
  /** 各段行数合计，供 UI 说明导出了多少条 */
  rows: number;
  content: string;
}

/** 趋势桶：调用数、错误数与平均耗时同源，KPI 卡的迷你折线也从这里取 */
export interface DashboardTrendPoint {
  label: string;
  calls: number;
  errors: number;
  avgLatencyMs: number;
}

/** 仪表盘的一屏数字，全部来自本进程的调用环形缓冲 */
export interface DashboardStats {
  range: '24h' | '7d' | '30d';
  calls: number;
  /** 与前一等长区间的百分比差 */
  callsDelta: number;
  errorRate: number;
  /** 百分点差 */
  errorRateDelta: number;
  p95LatencyMs: number;
  p95LatencyDeltaMs: number;
  uniqueIps: number;
  /** 参与统计的记录数，受环形缓冲容量约束 */
  sampled: number;
  /** true 表示缓冲里还有比窗口起点更旧（被挤出）的记录，长区间的数字因此不完整 */
  sampledCapped: boolean;
  trend: DashboardTrendPoint[];
  statusMix: { code: string; count: number; ratio: number }[];
  topApis: { path: string; calls: number; share: number }[];
}

/** 只登记真正参与请求链路判定的项：加字段就要有对应的 enforcement，否则后台会多出只会保存数字的开关 */
export interface SecuritySettings {
  maxBodySizeKb: number;
  globalRateLimit: { limit: number; periodSec: number };
  ipWhitelist: string[];
  ipBlacklist: string[];
  corsOrigins: string[];
}

/** 12 列网格里的一张卡的占位，首页 Live APIs 与接口广场共用 */
export interface CardSpan {
  /** 接口车单里的 id */
  id: string;
  cols: number;
  rows: number;
}

/** 后台读写的运行时设置：只登记真正参与渲染或请求链路的项，加字段就要有对应的消费方 */
export interface SiteSettings {
  /** 页脚与「联系我们」展示 */
  contactEmail: string;
  /** 页脚备案号 */
  icp: string;
  maintenanceMode: boolean;
  timezone: string;
  dateFormat: 'iso' | 'cn' | 'us';
  itemsPerPage: number;
  autoRefreshSec: number;
  /** 顺序即首页卡片排列顺序 */
  liveCardLayout: CardSpan[];
  /** 顺序即广场默认排列顺序（搜索命中时相关性优先），跨度按 id 匹配 */
  plazaCardLayout: CardSpan[];
}

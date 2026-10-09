/** 对外接口的返回形状与控制台视图模型；字段名即接口契约，改动会影响 /docs 页面与 Live 卡片 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiCategory = '内容' | '图片' | '数据';

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

export type WallpaperType = 'pc' | 'mobile' | 'bing';

/** 三类来源统一形状：本类型没有的字段一律为 null，而不是省略键 */
export interface WallpaperItem {
  /** 不传 type 时由服务端在三类中等概率随机选定 */
  type: WallpaperType;
  url: string;
  /** 体积远小于原图，供列表与卡片预览 */
  thumb: string;
  id: string;
  /** 读不出图像头时为 null */
  width: number | null;
  height: number | null;
  /** 以下三项只有 bing 有值 */
  title: string | null;
  copyright: string | null;
  date: string | null;
}

export type HotSearchPlatform = 'weibo' | 'douyin' | 'baidu' | 'zhihu';

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
  /** 224px 宽的 webp 派生图；目录里没有对应文件时不下发该字段 */
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
  | 'image';

export interface PublicApiMeta {
  /** 与响应头 x-trace-id 同值 */
  requestId: string;
  serverTime: string;
  site: string;
}

export interface PublicApiEnvelope<T> {
  statusCode: number;
  message: string;
  data: T;
  meta: PublicApiMeta;
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
  status: 'online' | 'degraded' | 'offline';
  authRequired: boolean;
  rateLimited: boolean;
  updatedAt: string;
}

export interface AccessRule {
  id: string;
  name: string;
  scope: string;
  /** 每 periodSec 秒内最多 limit 次 */
  limit: number;
  periodSec: number;
  action: '429' | 'reject' | 'captcha' | 'log';
  enabled: boolean;
  hitsToday: number;
  updatedAt: string;
}

export interface CallLog {
  id: string;
  time: string;
  path: string;
  method: HttpMethod;
  status: number;
  latencyMs: number;
  ip: string;
  region: string;
  /** key 或 anonymous */
  caller: string;
  ua: string;
  cacheHit: boolean;
}

export interface DashboardStats {
  callsToday: number;
  callsDelta: number;
  errorRate: number;
  errorRateDelta: number;
  p95LatencyMs: number;
  activeKeys: number;
  /** 长度随时间范围变化 */
  trend: { label: string; value: number }[];
  statusMix: { code: string; count: number; ratio: number }[];
  topApis: { path: string; calls: number; share: number }[];
  health: { name: string; uptime: number; status: 'ok' | 'warn' | 'down' }[];
  activities: { time: string; actor: string; action: string; target: string; tone: 'ok' | 'warn' | 'danger' }[];
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginNotify: boolean;
  sessionTimeoutMin: number;
  passwordPolicy: { minLength: number; requireUpper: boolean; requireDigit: boolean; requireSymbol: boolean };
  blockFailedAttempts: boolean;
  failedAttemptWindowMin: number;
  failedAttemptMax: number;
  wafEnabled: boolean;
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

export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  icp: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  enableComments: boolean;
  timezone: string;
  dateFormat: 'iso' | 'cn' | 'us';
  itemsPerPage: number;
  autoRefreshSec: number;
  /** 顺序即首页卡片排列顺序 */
  liveCardLayout: CardSpan[];
  /** 顺序无关，按 id 匹配当前筛选结果 */
  plazaCardLayout: CardSpan[];
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  tone: 'default' | 'alert';
  read: boolean;
}

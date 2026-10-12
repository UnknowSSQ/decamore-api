/** 只做「路径 + 出入参类型」的薄封装；组件层经 hooks 调用，不直接用 http */
import { API } from './endpoints';
import { http, type RequestOptions } from './http';
import type {
  AccessRule,
  ApiCatalogItem,
  AnswerBookEntry,
  AvatarListResult,
  AvatarType,
  CallLogPage,
  DashboardStats,
  EmojiListResult,
  EmojiType,
  ExchangeRateResult,
  ExportReportResult,
  GoldQuote,
  HotChartResult,
  HotMusicPlatform,
  HotMusicResult,
  HotPlayResult,
  HotPlayType,
  HotSearchPlatform,
  HotSearchResult,
  HitokotoLine,
  IdiomList,
  ImageListResult,
  ImageType,
  KfcCopy,
  ManagedApi,
  NeteaseComment,
  Paged,
  Poem,
  PoemDynastyParam,
  SecuritySettings,
  SiteSettings,
  SoulLine,
  StockBoard,
  TyphoonResult,
  TyphoonTrack,
  WallpaperItem,
  WallpaperType,
  WarningBoard,
  WarningLevel,
  WarningSignalType,
  WeatherNow,
} from '@/types';
import type { z } from 'zod';
import type {
  ApiListQuery,
  RuleListQuery,
  createApiSchema,
  createRuleSchema,
  exportReportBodySchema,
  logListQuerySchema,
  securityPatchSchema,
  siteSettingsPatchSchema,
  updateApiSchema,
  updateRuleSchema,
} from '@/lib/zod/admin.schema';
import type { RangeValue } from '@/lib/zod/common';

export function fetchDashboard(range: RangeValue = '24h') {
  return http.get<DashboardStats>(API.console.dashboard, { query: { range } });
}

/** 返回体形状由 ExportReportResult 单点定义，服务端与这里共用，不再各写一份泛型实参 */
export function exportReport(body: z.infer<typeof exportReportBodySchema>) {
  return http.post<ExportReportResult>(API.console.exportReport, body);
}

export function fetchManagedApis(query: Partial<ApiListQuery> = {}) {
  return http.get<Paged<ManagedApi>>(API.console.apis, { query });
}

export function createManagedApi(body: z.infer<typeof createApiSchema>) {
  return http.post<ManagedApi>(API.console.apis, body);
}

export function updateManagedApi(id: string, body: z.infer<typeof updateApiSchema>) {
  return http.patch<ManagedApi>(API.console.apiDetail(id), body);
}

export function fetchRules(query: Partial<RuleListQuery> = {}) {
  return http.get<Paged<AccessRule>>(API.console.rules, { query });
}

export function createRule(body: z.infer<typeof createRuleSchema>) {
  return http.post<AccessRule>(API.console.rules, body);
}

export function updateRule(id: string, body: z.infer<typeof updateRuleSchema>) {
  return http.patch<AccessRule>(API.console.ruleDetail(id), body);
}

export function deleteRule(id: string) {
  return http.delete<void>(API.console.ruleDetail(id));
}

export function fetchLogs(query: Partial<z.infer<typeof logListQuerySchema>> = {}) {
  return http.get<CallLogPage>(API.console.logs, { query });
}

export function fetchSecurity() {
  return http.get<SecuritySettings>(API.console.security);
}

export function patchSecurity(body: z.infer<typeof securityPatchSchema>) {
  return http.patch<SecuritySettings>(API.console.security, body);
}

/** list 覆盖式提交，非增量 */
export function saveIpWhitelist(list: string[]) {
  return http.post<{ ipWhitelist: string[] }>(API.console.ipWhitelist, { list });
}

export function removeIpWhitelist(ip: string) {
  return http.delete<void>(API.console.ipWhitelist, { query: { ip } });
}

export function saveIpBlacklist(list: string[]) {
  return http.post<{ ipBlacklist: string[] }>(API.console.ipBlacklist, { list });
}

export function removeIpBlacklist(ip: string) {
  return http.delete<void>(API.console.ipBlacklist, { query: { ip } });
}

export function saveCorsOrigins(origins: string[]) {
  return http.post<{ corsOrigins: string[] }>(API.console.cors, { origins });
}

export function fetchSiteSettings() {
  return http.get<SiteSettings>(API.console.settings);
}

export function patchSiteSettings(body: z.infer<typeof siteSettingsPatchSchema>) {
  return http.patch<SiteSettings>(API.console.settings, body);
}

/** 公开接口三件套：单层信封、不带鉴权头、无会话可续期。plaza 走后台信封，不在这里 */
function publicGet<T>(path: string, query?: RequestOptions['query']) {
  return http.get<T>(path, { query, envelope: 'public', anonymous: true, skipAuthRefresh: true });
}

export function fetchAnswerbook() {
  return publicGet<AnswerBookEntry>(API.publicApi.answerbook);
}

/** 本地演示仍读 constants/api-catalog，保证首屏可交互 */
export function fetchPlazaCatalog(params: { keyword?: string; category?: string } = {}) {
  return http.get<{ items: ApiCatalogItem[]; total: number }>(API.publicApi.plaza, {
    query: params,
    anonymous: true,
  });
}

export function fetchHitokoto() {
  return publicGet<HitokotoLine>(API.publicApi.hitokoto);
}

/** type 省略时服务端在四类等概率随机（WALLPAPER_TYPES 那一行是取值域） */
export function fetchWallpaper(type?: WallpaperType) {
  return publicGet<WallpaperItem>(API.publicApi.wallpaper, { type });
}

/** platform 省略时服务端按微博返回；榜单在服务端缓存 60 秒 */
export function fetchHotSearch(platform?: HotSearchPlatform, limit?: number) {
  return publicGet<HotSearchResult>(API.publicApi.hotsearch, { platform, limit });
}

/** platform 省略时按 QQ 音乐返回；同样缓存 60 秒、只给前 30 名 */
export function fetchHotMusic(platform?: HotMusicPlatform, limit?: number) {
  return publicGet<HotMusicResult>(API.publicApi.hotmusic, { platform, limit });
}

/** type 省略时返回电视剧榜；源是欢网大屏播出榜，缓存 10 分钟 */
export function fetchHotPlay(type?: HotPlayType, limit?: number) {
  return publicGet<HotPlayResult>(API.publicApi.hotplay, { type, limit });
}

/** 猫眼实时票房榜，服务端缓存 1 小时 */
export function fetchHotChart(limit?: number) {
  return publicGet<HotChartResult>(API.publicApi.hotchart, { limit });
}

/** type 省略时为 menhera */
export function fetchEmoji(type?: EmojiType, limit?: number) {
  return publicGet<EmojiListResult>(API.publicApi.emoji, { type, limit });
}

/** type 省略时为 boy */
export function fetchAvatars(type?: AvatarType, limit?: number) {
  return publicGet<AvatarListResult>(API.publicApi.avatar, { type, limit });
}

/** type 省略时为 beauty */
export function fetchImages(type?: ImageType, limit?: number) {
  return publicGet<ImageListResult>(API.publicApi.images, { type, limit });
}

/** dynasty 省略时服务端在唐 / 宋间等概率随机 */
export function fetchPoetry(dynasty?: PoemDynastyParam) {
  return publicGet<Poem>(API.publicApi.poetry, { dynasty });
}

/** limit 默认 1、上限 100；total 始终是全量条数，不是本次返回数 */
export function fetchIdioms(limit?: number) {
  return publicGet<IdiomList>(API.publicApi.idioms, { limit });
}

export function fetchSoulsoup() {
  return publicGet<SoulLine>(API.publicApi.soulsoup);
}

export function fetchKfc() {
  return publicGet<KfcCopy>(API.publicApi.kfc);
}

/** playlistId 省略时由服务端在内置歌单池里随机挑 */
export function fetchNeteaseComment(playlistId?: number) {
  return publicGet<NeteaseComment>(API.publicApi.netease, { id: playlistId });
}

/** 编号列表与路径是两个返回形状，拆成两个函数比联合类型好写调用方 */
export function fetchTyphoonList() {
  return publicGet<TyphoonResult>(API.publicApi.typhoon);
}

export function fetchTyphoonTrack(id: number) {
  return publicGet<TyphoonTrack>(API.publicApi.typhoon, { id });
}

export function fetchExchangeRates() {
  return publicGet<ExchangeRateResult>(API.publicApi.exchange);
}

/** city 是内置城市表的拼音键，省略即北京 */
export function fetchWeatherNow(city?: string) {
  return publicGet<WeatherNow>(API.publicApi.weather, { city });
}

export function fetchGoldQuote(contract?: string) {
  return publicGet<GoldQuote>(API.publicApi.gold, { contract });
}

/** codes 手工拼成逗号串：数组实参会被 http.ts 展开成重复键，而上游要的是一个逗号分隔值 */
export function fetchStockQuotes(codes: readonly string[]) {
  return publicGet<StockBoard>(API.publicApi.stock, { codes: codes.join(',') });
}

/** 三个筛选项都可省，省略即全部在架预警 */
export function fetchWeatherWarnings(filter?: {
  type?: WarningSignalType;
  level?: WarningLevel;
  region?: string;
  limit?: number;
}) {
  return publicGet<WarningBoard>(API.publicApi.warning, filter);
}

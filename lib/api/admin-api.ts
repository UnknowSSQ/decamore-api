/** 只做「路径 + 出入参类型」的薄封装；组件层经 hooks 调用，不直接用 http */
import { API } from './endpoints';
import { http } from './http';
import type {
  AccessRule,
  ApiCatalogItem,
  AnswerBookEntry,
  AvatarListResult,
  AvatarType,
  CallLog,
  DashboardStats,
  EmojiListResult,
  EmojiType,
  HotChartResult,
  HotMusicPlatform,
  HotMusicResult,
  HotPlayResult,
  HotPlayType,
  HotSearchPlatform,
  HotSearchResult,
  HitokotoLine,
  ImageListResult,
  ImageType,
  ManagedApi,
  NotificationItem,
  Paged,
  SecuritySettings,
  SiteSettings,
  WallpaperItem,
  WallpaperType,
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

export function fetchDashboard(range: RangeValue = '24h', live = false) {
  return http.get<DashboardStats>(API.console.dashboard, { query: { range, live: live ? '1' : undefined } });
}

/** 直链由服务端生成，前端不拼下载路径 */
export function exportReport(body: z.infer<typeof exportReportBodySchema>) {
  return http.post<{ fileName: string; downloadUrl: string; rows: number }>(API.console.exportReport, body);
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

export function deleteManagedApi(id: string) {
  return http.delete<void>(API.console.apiDetail(id));
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
  return http.get<Paged<CallLog>>(API.console.logs, { query });
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

export function fetchNotifications(unreadOnly = false) {
  return http.get<Paged<NotificationItem>>(API.console.notifications, {
    query: { unreadOnly: unreadOnly ? '1' : undefined },
  });
}

export function markNotificationRead(id: string) {
  return http.post<{ id: string; read: true }>(`${API.console.notifications}/${encodeURIComponent(id)}/read`, {});
}

/** 返回本次真正翻成已读的条数 */
export function markAllNotificationsRead() {
  return http.post<{ changed: number }>(API.console.notificationsReadAll, {});
}

export function fetchAnswerbook() {
  return http.get<AnswerBookEntry>(API.publicApi.answerbook, {
    envelope: 'public',
    anonymous: true,
    skipAuthRefresh: true,
  });
}

/** 本地演示仍读 constants/api-catalog，保证首屏可交互 */
export function fetchPlazaCatalog(params: { keyword?: string; category?: string } = {}) {
  return http.get<{ items: ApiCatalogItem[]; total: number }>(API.publicApi.plaza, {
    query: params,
    anonymous: true,
  });
}

export function fetchHitokoto() {
  return http.get<HitokotoLine>(API.publicApi.hitokoto, {
    envelope: 'public',
    anonymous: true,
    skipAuthRefresh: true,
  });
}

/** type 省略时服务端在 pc / mobile / bing 三类里等概率随机 */
export function fetchWallpaper(type?: WallpaperType) {
  return http.get<WallpaperItem>(API.publicApi.wallpaper, {
    query: { type },
    envelope: 'public',
    anonymous: true,
    skipAuthRefresh: true,
  });
}

/** platform 省略时服务端按微博返回；榜单在服务端缓存 60 秒 */
export function fetchHotSearch(platform?: HotSearchPlatform, limit?: number) {
  return http.get<HotSearchResult>(API.publicApi.hotsearch, {
    query: { platform, limit },
    envelope: 'public',
    anonymous: true,
    skipAuthRefresh: true,
  });
}

/** platform 省略时按 QQ 音乐返回；同样缓存 60 秒、只给前 30 名 */
export function fetchHotMusic(platform?: HotMusicPlatform, limit?: number) {
  return http.get<HotMusicResult>(API.publicApi.hotmusic, {
    query: { platform, limit },
    envelope: 'public',
    anonymous: true,
    skipAuthRefresh: true,
  });
}

/** type 省略时返回电视剧榜；源是欢网大屏播出榜，缓存 10 分钟 */
export function fetchHotPlay(type?: HotPlayType, limit?: number) {
  return http.get<HotPlayResult>(API.publicApi.hotplay, {
    query: { type, limit },
    envelope: 'public',
    anonymous: true,
    skipAuthRefresh: true,
  });
}

/** 猫眼实时票房榜，服务端缓存 1 小时 */
export function fetchHotChart(limit?: number) {
  return http.get<HotChartResult>(API.publicApi.hotchart, {
    query: { limit },
    envelope: 'public',
    anonymous: true,
    skipAuthRefresh: true,
  });
}

/** type 省略时为 menhera */
export function fetchEmoji(type?: EmojiType, limit?: number) {
  return http.get<EmojiListResult>(API.publicApi.emoji, {
    query: { type, limit },
    envelope: 'public',
    anonymous: true,
    skipAuthRefresh: true,
  });
}

/** type 省略时为 boy */
export function fetchAvatars(type?: AvatarType, limit?: number) {
  return http.get<AvatarListResult>(API.publicApi.avatar, {
    query: { type, limit },
    envelope: 'public',
    anonymous: true,
    skipAuthRefresh: true,
  });
}

/** type 省略时为 beauty */
export function fetchImages(type?: ImageType, limit?: number) {
  return http.get<ImageListResult>(API.publicApi.images, {
    query: { type, limit },
    envelope: 'public',
    anonymous: true,
    skipAuthRefresh: true,
  });
}

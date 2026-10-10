/**
 * 业务代码只写 `import { http, API, RequestError } from '@/lib/api'`。
 * 安全边界：这里的模块都会进浏览器 bundle，lib/server/*、lib/auth/jwt.ts、lib/auth/session.ts 一律不得导出，否则密钥打进前端资源。
 */
export { API } from './endpoints';
export { RequestError } from './error';
export type { RequestErrorCode, RequestErrorInit } from './error';
export { http, request } from './http';
export type { RequestOptions } from './http';
export {
  changePassword,
  fetchMe,
  fetchUsers,
  login,
  logout,
  refreshSession,
} from './auth-api';
export {
  createManagedApi,
  createRule,
  deleteRule,
  exportReport,
  fetchDashboard,
  fetchAnswerbook,
  fetchHitokoto,
  fetchHotSearch,
  fetchHotMusic,
  fetchHotPlay,
  fetchHotChart,
  fetchEmoji,
  fetchAvatars,
  fetchImages,
  fetchLogs,
  fetchManagedApis,
  fetchNotifications,
  fetchPlazaCatalog,
  fetchRules,
  fetchSecurity,
  fetchSiteSettings,
  fetchWallpaper,
  markAllNotificationsRead,
  markNotificationRead,
  patchSecurity,
  patchSiteSettings,
  removeIpBlacklist,
  removeIpWhitelist,
  saveCorsOrigins,
  saveIpBlacklist,
  saveIpWhitelist,
  updateManagedApi,
  updateRule,
} from './admin-api';

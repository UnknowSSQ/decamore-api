/** 与 app/api/** 目录一一对应；版本升级与路径参数拼装只改这里 */
const V1 = '/api/v1';

export const API = {
  health: '/api/health',
  auth: {
    login: `${V1}/auth/login`,
    refresh: `${V1}/auth/refresh`,
    logout: `${V1}/auth/logout`,
    me: `${V1}/auth/me`,
    changePassword: `${V1}/auth/password`,
    users: `${V1}/auth/users`,
  },
  /** 无需登录 */
  publicApi: {
    hitokoto: `${V1}/hitokoto`,
    answerbook: `${V1}/answerbook`,
    wallpaper: `${V1}/wallpaper`,
    hotsearch: `${V1}/hotsearch`,
    hotmusic: `${V1}/hotmusic`,
    hotplay: `${V1}/hotplay`,
    hotchart: `${V1}/hotchart`,
    emoji: `${V1}/emoji`,
    avatar: `${V1}/avatar`,
    images: `${V1}/images`,
    plaza: `${V1}/plaza`,
  },
  console: {
    dashboard: `${V1}/dashboard`,
    exportReport: `${V1}/dashboard/export`,
    apis: `${V1}/apis`,
    apiDetail: (id: string) => `${V1}/apis/${encodeURIComponent(id)}`,
    rules: `${V1}/rules`,
    ruleDetail: (id: string) => `${V1}/rules/${encodeURIComponent(id)}`,
    logs: `${V1}/logs`,
    security: `${V1}/security`,
    ipWhitelist: `${V1}/security/ip-whitelist`,
    ipBlacklist: `${V1}/security/ip-blacklist`,
    cors: `${V1}/security/cors`,
    settings: `${V1}/settings`,
    notifications: `${V1}/notifications`,
    notificationsReadAll: `${V1}/notifications/read-all`,
    stats: `${V1}/stats`,
  },
} as const;

/** 路由集中在这里，sidebar / nav / 重定向共用同一份，避免组件里散落硬编码路径 */

export const APP_NAME = 'Decamore API' as const;
export const APP_DESCRIPTION = '面向开发者打造免费轻量的多元接口能力，统一 JSON 格式输出，一步接入即可调用。';
export const APP_VERSION = '0.1.0';
export const CONSOLE_VERSION = 'console v2.6.0';
export const CONSOLE_REGION = 'cn-east';
export const COPYRIGHT_YEAR = 2026;

export const ROUTES = {
  home: '/',
  login: '/login',
  plaza: '/plaza',
  docs: '/docs',
  /** 控制台入口（服务端会按权限重定向到 dashboard） */
  admin: '/admin',
  adminDashboard: '/admin/dashboard',
  adminApis: '/admin/apis',
  adminRules: '/admin/rules',
  adminLogs: '/admin/logs',
  adminSecurity: '/admin/security',
  adminSettings: '/admin/settings',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

/** slug 必须是 API_CATALOG 的 id */
export function docApiHref(slug: string): string {
  return `${ROUTES.docs}/${slug}`;
}

/** 登录后只允许跳到这里列出的路由，防开放重定向 */
export const INTERNAL_REDIRECT_ALLOWLIST: readonly AppRoute[] = [
  ROUTES.adminDashboard,
  ROUTES.adminApis,
  ROUTES.adminRules,
  ROUTES.adminLogs,
  ROUTES.adminSecurity,
  ROUTES.adminSettings,
  ROUTES.plaza,
  ROUTES.docs,
  ROUTES.home,
];

export const MAIN_NAV: readonly { label: string; href: string; external?: boolean }[] = [
  { label: '接口广场', href: ROUTES.plaza },
  { label: '文档', href: ROUTES.docs },
] as const;

export const NAV_CTA = { label: '即刻体验', href: `${ROUTES.home}#contact` } as const;

/** 邮箱唯一真值，mailto 链接由它拼装，避免两处字面量不同步 */
export const CONTACT_EMAIL = '7905207@qq.com' as const;

/** subject 含中文与空格，编码在这里集中做一次 */
export function mailtoWithSubject(subject: string, email: string = CONTACT_EMAIL): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

export const FOOTER_LINKS: readonly { label: string; href: string; external?: boolean }[] = [
  { label: '概览', href: ROUTES.home },
  { label: '接口广场', href: ROUTES.plaza },
  { label: '文档', href: ROUTES.docs },
  { label: '控制台', href: ROUTES.login },
] as const;

/** 路由集中在这里，sidebar / nav / 重定向共用同一份，避免组件里散落硬编码路径 */
import type { Route } from 'next';
import pkg from '../package.json';

export const APP_NAME = 'Decamore API' as const;
export const APP_DESCRIPTION = '面向开发者打造免费轻量的多元接口能力，统一 JSON 格式输出，一步接入即可调用。';
/** 版本号只有 package.json 一份：手改这里迟早和包版本脱节 */
export const APP_VERSION = pkg.version;
export const CONSOLE_VERSION = 'console v2.6.0';
export const CONSOLE_REGION = 'cn-east';
export const COPYRIGHT_YEAR = 2026;

/**
 * 值带 Next 的 Route 品牌：开了 typedRoutes 之后，href / router.push 只认这个类型，
 * 常量本身写错路径由下面的 AppRoute 联合与人工核对兜住。
 */
export const ROUTES = {
  home: '/' as Route,
  login: '/login' as Route,
  plaza: '/plaza' as Route,
  docs: '/docs' as Route,
  /** 控制台入口（服务端会按权限重定向到 dashboard） */
  admin: '/admin' as Route,
  adminDashboard: '/admin/dashboard' as Route,
  adminApis: '/admin/apis' as Route,
  adminRules: '/admin/rules' as Route,
  adminLogs: '/admin/logs' as Route,
  adminSecurity: '/admin/security' as Route,
  adminSettings: '/admin/settings' as Route,
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

/** slug 必须是 API_CATALOG 的 id */
export function docApiHref(slug: string): Route {
  return `${ROUTES.docs}/${slug}` as Route;
}

export const MAIN_NAV: readonly { label: string; href: Route; external?: boolean }[] = [
  { label: '接口广场', href: ROUTES.plaza },
  { label: '文档', href: ROUTES.docs },
] as const;

export const NAV_CTA = { label: '即刻体验', href: `${ROUTES.home}#contact` as Route } as const;

/** 邮箱唯一真值，mailto 链接由它拼装，避免两处字面量不同步 */
export const CONTACT_EMAIL = '7905207@qq.com' as const;

/** subject 含中文与空格，编码在这里集中做一次 */
export function mailtoWithSubject(subject: string, email: string = CONTACT_EMAIL): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

export const FOOTER_LINKS: readonly { label: string; href: Route; external?: boolean }[] = [
  { label: '概览', href: ROUTES.home },
  { label: '接口广场', href: ROUTES.plaza },
  { label: '文档', href: ROUTES.docs },
  { label: '控制台', href: ROUTES.login },
] as const;

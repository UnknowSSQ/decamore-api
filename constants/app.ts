/** 路由集中在这里，sidebar / nav / 重定向共用同一份，避免组件里散落硬编码路径 */
import type { Route } from 'next';
import pkg from '../package.json';

export const APP_NAME = 'Decamore API' as const;
export const APP_DESCRIPTION = '面向开发者打造免费轻量的多元接口能力，统一 JSON 格式输出，一步接入即可调用。';
/** 版本号只有 package.json 一份：手改这里迟早和包版本脱节 */
export const APP_VERSION = pkg.version;
export const COPYRIGHT_YEAR = 2026;

/**
 * 免鉴权公开接口的单 IP 每分钟默认阈值。
 * env 的 RATE_LIMIT_PER_MIN 用它兜底，文档站也引用同一个数，免得两边各写一份再漂移。
 */
export const RATE_LIMIT_PER_MIN_DEFAULT = 120;

/**
 * 状态码家族的取色：仪表盘的分布图与日志页的状态条共用一张表。
 * 此前两处各写一份，同一个 2xx 一边 `#365b49` 一边 `#2f7a4f`、4xx 一边 `#c2a36f` 一边 `#c2703f`，
 * 而仪表盘那句「按族取色，避免同一族在不同区间换颜色」的注释正是为了不让这件事发生。
 */
export const STATUS_FAMILY_COLORS: Record<string, string> = {
  '2xx': '#365b49',
  '3xx': '#7d9884',
  '4xx': '#c2a36f',
  '5xx': '#b3512f',
  '429': '#8a5a2d',
};

/**
 * 调用环形缓冲的条数上限：stats 按它裁剪，控制台的三处文案按它说话。
 * 放在 constants 而不是 stats.ts，是因为 stats 带 server-only，客户端组件读不到。
 */
export const CALL_RING_CAPACITY = 500;

/**
 * 值带 Next 的 Route 品牌：开了 typedRoutes 之后，href / router.push 只认这个类型，
 * 路径写错在 tsc 阶段就报，常量本身的名字与取值靠人工核对。
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
  adminCards: '/admin/cards' as Route,
  adminSettings: '/admin/settings' as Route,
} as const;

/** slug 必须是 API_CATALOG 的 id */
export function docApiHref(slug: string): Route {
  return `${ROUTES.docs}/${slug}` as Route;
}

export const MAIN_NAV: readonly { label: string; href: Route }[] = [
  { label: '接口广场', href: ROUTES.plaza },
  { label: '文档', href: ROUTES.docs },
] as const;

export const NAV_CTA = { label: '即刻体验', href: `${ROUTES.home}#contact` as Route } as const;

/** 联系邮箱的种子值：后台「网站设置」改的是 store 里的副本，页面读的一律是 store */
export const CONTACT_EMAIL = '7905207@qq.com' as const;

/** subject 含中文与空格，编码在这里集中做一次 */
export function mailtoWithSubject(subject: string, email: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

export const FOOTER_LINKS: readonly { label: string; href: Route }[] = [
  { label: '概览', href: ROUTES.home },
  { label: '接口广场', href: ROUTES.plaza },
  { label: '文档', href: ROUTES.docs },
  { label: '控制台', href: ROUTES.login },
] as const;

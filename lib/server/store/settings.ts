import 'server-only';
import type { CardSpan, SiteSettings } from '@/types';

import { DEFAULT_LIVE_CARD_LAYOUT, DEFAULT_PLAZA_CARD_LAYOUT } from '@/constants/card-layout';

/** 逐项拷贝：默认常量是共享只读值，不能被进程内改写 */
const cloneLayout = (layout: readonly CardSpan[]): CardSpan[] => layout.map((span) => ({ ...span }));

/** 默认值变了要 bump 版本号：单例活过 dev 热重载，不换版本改了 DEFAULT_LIVE_CARD_LAYOUT 也看不到 */
const SETTINGS_SEED_VERSION = '2026-10-08.static-asset-cards';

function seedSettings(): SiteSettings {
  return {
    siteName: 'Decamore API',
    siteDescription: '面向开发者打造免费轻量的多元接口能力',
    contactEmail: 'support@decamore.dev',
    icp: '沪ICP备2026000000号',
    maintenanceMode: false,
    maintenanceMessage: '',
    enableComments: true,
    timezone: 'Asia/Shanghai',
    dateFormat: 'iso',
    itemsPerPage: 12,
    autoRefreshSec: 30,
    liveCardLayout: cloneLayout(DEFAULT_LIVE_CARD_LAYOUT),
    plazaCardLayout: cloneLayout(DEFAULT_PLAZA_CARD_LAYOUT),
  };
}

/** 挂 globalThis：Next 按 route 分包，模块级变量每个 chunk 一份，route 写入后页面读到的还是旧值 */
const globalStore = globalThis as typeof globalThis & {
  __decamoreSettings?: SiteSettings;
  __decamoreSettingsSeed?: string;
};

if (globalStore.__decamoreSettingsSeed !== SETTINGS_SEED_VERSION) {
  globalStore.__decamoreSettingsSeed = SETTINGS_SEED_VERSION;
  globalStore.__decamoreSettings = seedSettings();
}

export const MOCK_SETTINGS: SiteSettings = globalStore.__decamoreSettings!;

/** 两个布局数组逐项重新拷贝，改返回值不会污染单例 */
export function getSiteSettings(): SiteSettings {
  return {
    ...MOCK_SETTINGS,
    liveCardLayout: cloneLayout(MOCK_SETTINGS.liveCardLayout),
    plazaCardLayout: cloneLayout(MOCK_SETTINGS.plazaCardLayout),
  };
}

/** Object.assign 直接改单例，重启回到默认值 */
export function patchSiteSettings(patch: Partial<SiteSettings>): SiteSettings {
  Object.assign(MOCK_SETTINGS, patch);
  return getSiteSettings();
}

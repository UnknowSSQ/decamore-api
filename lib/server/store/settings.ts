import 'server-only';
import type { CardSpan, SiteSettings } from '@/types';

import { CONTACT_EMAIL } from '@/constants/app';
import { DEFAULT_LIVE_CARD_LAYOUT, DEFAULT_PLAZA_CARD_LAYOUT } from '@/constants/card-layout';
import { createKvBackedConfig, hasKey } from './config';

/** 逐项拷贝：默认常量是共享只读值，不能被进程内改写 */
const cloneLayout = (layout: readonly CardSpan[]): CardSpan[] => layout.map((span) => ({ ...span }));

/** 默认值变了要 bump 版本号：单例活过 dev 热重载，不换版本改了 DEFAULT_LIVE_CARD_LAYOUT 也看不到 */
const SETTINGS_SEED_VERSION = '2026-10-11.stock-warning-cards';

function seedSettings(): SiteSettings {
  return {
    contactEmail: CONTACT_EMAIL,
    icp: '渝ICP备2024027632号-1',
    maintenanceMode: false,
    timezone: 'Asia/Chongqing',
    dateFormat: 'iso',
    itemsPerPage: 12,
    autoRefreshSec: 30,
    liveCardLayout: cloneLayout(DEFAULT_LIVE_CARD_LAYOUT),
    plazaCardLayout: cloneLayout(DEFAULT_PLAZA_CARD_LAYOUT),
  };
}

/** 认一个必然存在的字段即可；形状不对就丢弃外部数据、继续用内存种子 */
const store = createKvBackedConfig<SiteSettings>({
  slot: 'Settings',
  key: 'decamore:settings',
  seedVersion: SETTINGS_SEED_VERSION,
  seed: seedSettings,
  accepts: hasKey<SiteSettings>('contactEmail'),
});

const SETTINGS = store.value;

/** 两个布局数组逐项重新拷贝，改返回值不会污染单例 */
export function getSiteSettings(): SiteSettings {
  return {
    ...SETTINGS,
    liveCardLayout: cloneLayout(SETTINGS.liveCardLayout),
    plazaCardLayout: cloneLayout(SETTINGS.plazaCardLayout),
  };
}

/** Object.assign 直接改单例，重启回到默认值；redis 后端下顺手镜像到外部 */
export function patchSiteSettings(patch: Partial<SiteSettings>): SiteSettings {
  Object.assign(SETTINGS, patch);
  store.mirror();
  return getSiteSettings();
}

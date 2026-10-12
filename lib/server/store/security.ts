import 'server-only';
import type { SecuritySettings } from '@/types';
import { createKvBackedConfig, hasKey } from './config';

/** 默认值变了要 bump 版本号：单例活过 dev 热重载，不换版本改了这里的初值也看不到 */
const SECURITY_SEED_VERSION = '2026-10-10.narrow-defaults';

/** 请求体上限的默认值（KB）。validate.ts 的兜底常量由它派生，别再各写一份 64 */
export const DEFAULT_MAX_BODY_SIZE_KB = 64;

const seedSecurity = (): SecuritySettings => ({
  maxBodySizeKb: DEFAULT_MAX_BODY_SIZE_KB,
  globalRateLimit: { limit: 5000, periodSec: 3600 },
  /**
   * 默认不放任何网段：白名单豁免频控与访问规则，而 `trace.ts:73` 在缺转发头时把所有请求都算成 `127.0.0.1`，
   * 豁免本机等于在没配代理头的部署上关掉整套限流。`10/8`、`172.16/12` 这类大网段更是给可伪装的来源开免检。
   * 确实要豁免（内网调用方、拨测机）就在后台「安全设置」里按精确 IP 加。
   */
  ipWhitelist: [],
  /** 种子不放演示 IP：黑名单是封禁动作，摆两个文档保留地址只会让控制台显示「2 条」却谁也没挡住 */
  ipBlacklist: [],
  corsOrigins: ['https://decamore.dev', 'https://console.decamore.dev'],
});

const store = createKvBackedConfig<SecuritySettings>({
  slot: 'Security',
  key: 'decamore:security',
  seedVersion: SECURITY_SEED_VERSION,
  seed: seedSecurity,
  accepts: hasKey<SecuritySettings>('maxBodySizeKb'),
});

const SECURITY = store.value;

/** 数组逐项拷出，调用方拿到的是快照，改写不会污染单例 */
function snapshot(settings: SecuritySettings): SecuritySettings {
  return {
    ...settings,
    globalRateLimit: { ...settings.globalRateLimit },
    ipWhitelist: [...settings.ipWhitelist],
    ipBlacklist: [...settings.ipBlacklist],
    corsOrigins: [...settings.corsOrigins],
  };
}

export function getSecuritySettings(): SecuritySettings {
  return snapshot(SECURITY);
}

export function patchSecuritySettings(patch: Partial<SecuritySettings>): SecuritySettings {
  Object.assign(SECURITY, patch);
  store.mirror();
  return snapshot(SECURITY);
}

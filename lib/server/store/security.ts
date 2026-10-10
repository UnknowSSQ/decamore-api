import 'server-only';
import type { SecuritySettings } from '@/types';

/** 默认值变了要 bump 版本号：单例活过 dev 热重载，不换版本改了这里的初值也看不到 */
const SECURITY_SEED_VERSION = '2026-10-09.enforced-cors-ip-bodylimit';

const seedSecurity = (): SecuritySettings => ({
  twoFactorEnabled: false,
  loginNotify: true,
  sessionTimeoutMin: 30,
  passwordPolicy: {
    minLength: 8,
    requireUpper: true,
    requireDigit: true,
    requireSymbol: false,
  },
  blockFailedAttempts: true,
  failedAttemptWindowMin: 15,
  failedAttemptMax: 5,
  wafEnabled: true,
  maxBodySizeKb: 64,
  globalRateLimit: { limit: 5000, periodSec: 3600 },
  ipWhitelist: ['10.0.0.0/8', '172.16.0.0/12'],
  ipBlacklist: ['198.51.100.42', '192.0.2.18'],
  corsOrigins: ['https://decamore.dev', 'https://console.decamore.dev'],
});

/** 挂 globalThis：Next 按 route 分包，模块级变量每个 chunk 一份，/security 写入后 ip-blacklist 与守卫读到的还是旧值 */
const globalStore = globalThis as typeof globalThis & {
  __decamoreSecurity?: SecuritySettings;
  __decamoreSecuritySeed?: string;
};

if (globalStore.__decamoreSecuritySeed !== SECURITY_SEED_VERSION) {
  globalStore.__decamoreSecuritySeed = SECURITY_SEED_VERSION;
  globalStore.__decamoreSecurity = seedSecurity();
}

const SECURITY: SecuritySettings = globalStore.__decamoreSecurity!;

/** 数组逐项拷出，调用方拿到的是快照，改写不会污染单例 */
function snapshot(settings: SecuritySettings): SecuritySettings {
  return {
    ...settings,
    passwordPolicy: { ...settings.passwordPolicy },
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
  return snapshot(SECURITY);
}

import type { SecuritySettings } from '@/types';

export const MOCK_SECURITY: SecuritySettings = {
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
};

/** 浅拷贝，passwordPolicy 与 globalRateLimit 仍是同一引用 */
export function getSecuritySettings(): SecuritySettings {
  return { ...MOCK_SECURITY };
}

/** Object.assign 直接改单例，重启回到初值 */
export function patchSecuritySettings(patch: Partial<SecuritySettings>): SecuritySettings {
  Object.assign(MOCK_SECURITY, patch);
  return { ...MOCK_SECURITY };
}

/**
 * cookie 模式（默认）token 留在 httpOnly Cookie 里，本模块只存 expiresIn 与用户缓存；local 模式才持久化 token 供注入 Authorization。
 * 所有 localStorage 读写都过 isBrowser() 并 catch 异常：SSR 阶段没有 window，隐私模式 / 配额超限时写入会抛。
 */
'use client';

import { STORAGE_KEYS, REFRESH_LEEWAY_MS } from '@/constants/auth';
import type { AuthUser, TokenStorageMode } from '@/types';

// 模块加载时定型，运行期换模式要整页刷新
const MODE: TokenStorageMode = readStoredMode() === 'local' ? 'local' : 'cookie';

/** 这一句跑在 import 阶段，隐私模式禁用存储时 getItem 会抛，不能让整包一起挂 */
function readStoredMode(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem('decamore.tokenMode');
  } catch {
    return null;
  }
}

/** localStorage 抛异常时的内存兜底 */
const memory = new Map<string, string>();

export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function getItem(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function setItem(key: string, value: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    memory.set(key, value);
  }
}

function removeItem(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    memory.delete(key);
  }
}

export const tokenStorage = {
  mode: MODE,

  /** cookie 模式下恒为 null，token 读不出来也不该读 */
  getAccessToken(): string | null {
    return MODE === 'local' ? getItem(STORAGE_KEYS.accessToken) : null;
  },
  getRefreshToken(): string | null {
    return MODE === 'local' ? getItem(STORAGE_KEYS.refreshToken) : null;
  },
  setTokens(tokens: { accessToken: string; refreshToken?: string; expiresIn: number }): void {
    if (MODE !== 'local') {
      // cookie 模式只记过期时间，供提前续期判断
      setItem(STORAGE_KEYS.expiresAt, String(Date.now() + tokens.expiresIn * 1000));
      return;
    }
    setItem(STORAGE_KEYS.accessToken, tokens.accessToken);
    if (tokens.refreshToken) setItem(STORAGE_KEYS.refreshToken, tokens.refreshToken);
    setItem(STORAGE_KEYS.expiresAt, String(Date.now() + tokens.expiresIn * 1000));
  },
  clear(): void {
    removeItem(STORAGE_KEYS.accessToken);
    removeItem(STORAGE_KEYS.refreshToken);
    removeItem(STORAGE_KEYS.expiresAt);
    removeItem(STORAGE_KEYS.rememberedAccount);
  },

  /** 毫秒；从未成功登录过时为 0 */
  getExpiresAt(): number {
    const raw = getItem(STORAGE_KEYS.expiresAt);
    return raw ? Number(raw) : 0;
  },
  /** 提前 REFRESH_LEEWAY_MS 判定，给续期留出往返时间 */
  isExpiringSoon(): boolean {
    const exp = tokenStorage.getExpiresAt();
    if (!exp) return false;
    return exp - Date.now() <= REFRESH_LEEWAY_MS;
  },
  isExpired(): boolean {
    const exp = tokenStorage.getExpiresAt();
    return Boolean(exp) && exp <= Date.now();
  },

  /** 记住的账号（仅用于登录页回填，不涉及安全） */
  getRememberedAccount(): string {
    return getItem(STORAGE_KEYS.rememberedAccount) ?? '';
  },
  setRememberedAccount(account: string): void {
    if (account) setItem(STORAGE_KEYS.rememberedAccount, account);
    else removeItem(STORAGE_KEYS.rememberedAccount);
  },

  /** 只影响首屏渲染速度，权限判定仍以服务端为准 */
  getCachedUser(): AuthUser | null {
    const raw = getItem('decamore.userCache');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },
  setCachedUser(user: AuthUser | null): void {
    if (user) setItem('decamore.userCache', JSON.stringify(user));
    else removeItem('decamore.userCache');
  },
};

/** 非 httpOnly，浏览器读得到才能注入 X-CSRF-Token */
export function readCsrfFromCookie(): string | null {
  if (!isBrowser()) return null;
  const match = document.cookie.match(/(?:^|;\s*)dc_csrf=([^;]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/** 其它标签页登出时本标签页同步清状态；@returns 取消订阅函数 */
export function subscribeTokenChanges(handler: () => void): () => void {
  if (!isBrowser()) return () => undefined;
  const listener = (event: StorageEvent) => {
    if (Object.values(STORAGE_KEYS).includes(event.key as never) || event.key === null) handler();
  };
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}

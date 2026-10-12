/** 只负责状态呈现：真正的授权在服务端（lib/server/guards + withApiHandler），这里的 permissions 只影响 UI 显隐。
 *  会话来源优先级：SSR 引导 > 本地缓存用户 > /api/v1/auth/me 兜底刷新 */
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

import { REFRESH_LEEWAY_MS } from '@/constants/auth';
import { ROUTES } from '@/constants/app';
import { fetchMe, login as apiLogin, logout as apiLogout, refreshSession } from '@/lib/api/auth-api';
import { RequestError } from '@/lib/api/error';
import { hasPermission as checkPermission } from '@/lib/auth/permissions';
import { isBrowser, subscribeTokenChanges, tokenStorage } from '@/lib/auth/token-store';
import type { AuthUser, LoginResult, Permission } from '@/types';
import type { LoginInput } from '@/lib/zod/auth.schema';

/** 只有这三样有人消费：user/status 等留在 Provider 内部，需要对外暴露时再加，别先摊开一排没人读的字段 */
interface AuthContextValue {
  can: (permission: Permission) => boolean;
  signIn: (input: LoginInput) => Promise<LoginResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// lib/api/http 在 401 续期失败时广播这个事件
const AUTH_EXPIRED_EVENT = 'decamore:auth-expired';

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  // 会话由客户端自查：首屏用 localStorage 缓存的用户，随后 reload() 拿 /auth/me 校准
  const [user, setUser] = useState<AuthUser | null>(tokenStorage.getCachedUser());
  const [expiresAt, setExpiresAt] = useState<number>(tokenStorage.getExpiresAt());

  // 定时器与「正在续期」标记放 ref，避免闭包读到旧值
  const refreshingRef = useRef(false);
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 首屏兜底校验只做一次（StrictMode 下 effect 会被重复执行） */
  const bootCheckedRef = useRef(false);

  const reload = useCallback(async () => {
    if (!isBrowser()) return;
    try {
      const me = await fetchMe();
      setUser(me.user);
      setExpiresAt(me.expiresAt);
      tokenStorage.setCachedUser(me.user);
    } catch (error: unknown) {
      // 401 已由 http 封装处理续期与广播；其它异常保留现有 user，不把网络故障谎报成未登录
      if (error instanceof RequestError && error.isUnauthorized) {
        setUser(null);
        setExpiresAt(0);
      }
    }
  }, []);

  useEffect(() => {
    if (bootCheckedRef.current) return;
    // cookie 模式下读不到 token，但可能已有会话 → 静默校验一次
    bootCheckedRef.current = true;
    void reload();
  }, [reload]);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setExpiresAt(0);
      tokenStorage.clear();
      tokenStorage.setCachedUser(null);
      // 只在受保护区域强制跳转，广场/文档保持可浏览
      if (isBrowser() && window.location.pathname.startsWith('/admin')) {
        const back = encodeURIComponent(window.location.pathname + window.location.search);
        router.replace(`${ROUTES.login}?redirect=${back}`);
      }
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [router]);

  // 另一页登出时本页同步状态
  useEffect(() => {
    const unsubscribe = subscribeTokenChanges(() => {
      const cached = tokenStorage.getCachedUser();
      if (!cached) {
        setUser(null);
      } else {
        setUser(cached);
        void reload();
      }
    });
    return unsubscribe;
  }, [reload]);

  const doRefresh = useCallback(async (): Promise<boolean> => {
    if (refreshingRef.current) return false;
    refreshingRef.current = true;
    try {
      const result = await refreshSession();
      tokenStorage.setTokens({ accessToken: result.accessToken, expiresIn: result.expiresIn });
      setExpiresAt(Date.now() + result.expiresIn * 1000);
      return true;
    } catch {
      return false;
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    if (!user || !expiresAt) return;

    const delay = expiresAt - Date.now() - REFRESH_LEEWAY_MS;
    expiryTimerRef.current = setTimeout(
      () => {
        void doRefresh();
      },
      // delay 为负说明已经过期，兜个 5s 再试
      Math.max(5_000, delay),
    );
    return () => {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    };
  }, [user, expiresAt, doRefresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !user) return;
      // 挂机回来后 token 可能已过期：直接走一次 me，失败即由封装广播登出
      if (tokenStorage.isExpired() || tokenStorage.isExpiringSoon()) void doRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user, doRefresh]);

  const signIn = useCallback(async (input: LoginInput): Promise<LoginResult> => {
    const result = await apiLogin(input);

    // cookie 模式浏览器已收到 Set-Cookie；local 模式还要落 token 供请求拦截器注入
    tokenStorage.setTokens({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    });
    tokenStorage.setCachedUser(result.user);
    if (input.remember) tokenStorage.setRememberedAccount(input.account);
    else tokenStorage.setRememberedAccount('');

    setUser(result.user);
    setExpiresAt(Date.now() + result.expiresIn * 1000);
    return result;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // 服务端登出失败也要清本地，否则会卡在「已登录但无效」状态
    } finally {
      tokenStorage.clear();
      tokenStorage.setCachedUser(null);
      setUser(null);
      setExpiresAt(0);
      router.replace(ROUTES.login);
      router.refresh();
    }
  }, [router]);

  const can = useCallback(
    (permission: Permission) => Boolean(user && checkPermission(user.permissions, permission)),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ can, signIn, signOut }),
    [can, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** 缺 Provider 时立刻抛错，而不是静默返回 null */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用（见 components/providers/AppProviders.tsx）');
  return ctx;
}

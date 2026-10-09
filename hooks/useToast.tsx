/** 状态与计时在 hooks 层（Provider 跨路由持久，切页不打断提示），渲染在 components/ui/Toast.tsx。
 *  setTimeout 只在 effect 里注册、不放 setState updater —— updater 在 StrictMode 下会执行两次 */
'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { ToastTone } from '@/types';

const DEFAULT_DURATION_MS = 3200;
const MAX_TOASTS = 4;

export interface ToastItem {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  /** 自动关闭延时；0 表示常驻 */
  duration: number;
  count: number;
  createdAt: number;
}

export interface ToastInput {
  tone?: ToastTone;
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastApi {
  toasts: ToastItem[];
  show: (input: ToastInput) => string;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToastState(): ToastApi {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const alive = new Set(toasts.map((t) => t.id));

    timers.current.forEach((timer, id) => {
      if (!alive.has(id)) {
        clearTimeout(timer);
        timers.current.delete(id);
      }
    });

    for (const toast of toasts) {
      if (toast.duration <= 0) continue;
      const existing = timers.current.get(toast.id);
      if (existing) clearTimeout(existing);
      timers.current.set(
        toast.id,
        setTimeout(() => dismiss(toast.id), toast.duration),
      );
    }
  }, [toasts, dismiss]);

  // 路由级 Provider 一般不触发，卸载时清一遍定时器兜底
  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => clearTimeout(t));
  }, []);

  const show = useCallback(({ tone = 'info', title, description, duration = DEFAULT_DURATION_MS }: ToastInput) => {
    const id = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    setToasts((prev) => {
      const dup = prev.find((t) => t.title === title && t.tone === tone);
      if (dup) {
        // 计数 +1 并重置 duration，重新计时交给上面那个 effect
        return prev.map((t) =>
          t.id === dup.id ? { ...t, count: t.count + 1, description: description ?? t.description, duration } : t,
        );
      }
      const item: ToastItem = { id, tone, title, description, duration, count: 1, createdAt: Date.now() };
      return [item, ...prev].slice(0, MAX_TOASTS);
    });

    return id;
  }, []);

  return useMemo<ToastApi>(
    () => ({
      toasts,
      show,
      success: (title, description) => show({ tone: 'success', title, description }),
      error: (title, description) => show({ tone: 'error', title, description, duration: 4600 }),
      warning: (title, description) => show({ tone: 'warning', title, description }),
      info: (title, description) => show({ tone: 'info', title, description }),
      dismiss,
      clear: () => setToasts([]),
    }),
    [toasts, show, dismiss],
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast 必须在 ToastProvider 内使用（见 components/providers/AppProviders.tsx）');
  return ctx;
}

export { ToastContext };

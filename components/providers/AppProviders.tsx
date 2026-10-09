'use client';
/**
 * ToastProvider 必须包在 AuthProvider 外层：useAuth 请求失败时要弹 toast。
 * root layout 保持 Server Component，客户端边界只收到这一层。
 */
import { useContext, type ReactNode } from 'react';

import { AuthProvider, type BootstrapSession } from '@/hooks/useAuth';
import { ToastContext, useToastState, type ToastApi } from '@/hooks/useToast';
import { ToastViewport } from '@/components/ui/Toast';

const NoopToast: ToastApi = {
  toasts: [],
  show: () => '',
  success: () => '',
  error: () => '',
  warning: () => '',
  info: () => '',
  dismiss: () => undefined,
  clear: () => undefined,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const api = useToastState();
  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

export function AppProviders({ bootstrap, children }: { bootstrap: BootstrapSession | null; children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider bootstrap={bootstrap}>{children}</AuthProvider>
    </ToastProvider>
  );
}

/** 没有 Provider 时回落 NoopToast，独立渲染与单测不炸 */
export function useToastSafe(): ToastApi {
  return useContext(ToastContext) ?? NoopToast;
}

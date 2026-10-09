'use client';
/** 竞态保护靠比对请求序号而不是 AbortController：过期响应直接丢弃，调用方不用传 signal；
 *  组件已卸载时同样不写状态 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { RequestError } from '@/lib/api/error';
import { useToast } from './useToast';

export interface UseRequestOptions {
  immediate?: boolean;
  /** 表单类错误要内联展示时关掉自动 toast */
  toastError?: boolean;
  successMessage?: string;
}

export interface UseRequestResult<TArgs extends unknown[], TData> {
  data: TData | undefined;
  error: RequestError | undefined;
  /** 仅在还没有数据时为 true：骨架屏用 */
  loading: boolean;
  /** 任意一次请求进行中：按钮 disabled 用 */
  pending: boolean;
  run: (...args: TArgs) => Promise<TData | undefined>;
  refetch: () => Promise<TData | undefined>;
  reset: () => void;
  /** 状态本体是 TData | undefined（reset 会写回 undefined），所以更新函数也允许返回 undefined */
  setData: (updater: TData | undefined | ((prev: TData | undefined) => TData | undefined)) => void;
}

export function useRequest<TArgs extends unknown[], TData>(
  fetcher: (...args: TArgs) => Promise<TData>,
  options: UseRequestOptions = {},
): UseRequestResult<TArgs, TData> {
  const { immediate = false, toastError = true, successMessage } = options;
  const toast = useToast();

  const [data, setData] = useState<TData | undefined>(undefined);
  const [error, setError] = useState<RequestError | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [pending, setPending] = useState(false);

  const seq = useRef(0);
  const mounted = useRef(true);
  const lastArgs = useRef<TArgs | null>(null);
  // 有没有拿到过数据：决定这次算「骨架屏加载」还是「静默刷新」
  const hasDataRef = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (...args: TArgs): Promise<TData | undefined> => {
      lastArgs.current = args;
      const ticket = ++seq.current;
      setPending(true);
      // 已有数据时保留内容，只用 pending 表示刷新中
      if (!hasDataRef.current) setLoading(true);
      setError(undefined);

      try {
        const result = await fetcher(...args);
        if (!mounted.current || ticket !== seq.current) return undefined;
        hasDataRef.current = true;
        setData(result);
        if (successMessage) toast.success(successMessage);
        return result;
      } catch (err: unknown) {
        if (!mounted.current || ticket !== seq.current) return undefined;
        const requestError =
          err instanceof RequestError ? err : new RequestError({ status: 0, code: 'SERVER', message: '请求失败' });
        setError(requestError);
        if (toastError) toast.error(requestError.message, requestError.description);
        return undefined;
      } finally {
        if (mounted.current && ticket === seq.current) {
          setLoading(false);
          setPending(false);
        }
      }
    },
    [fetcher, successMessage, toast, toastError],
  );

  const refetch = useCallback(() => {
    const args = lastArgs.current;
    return args ? run(...args) : Promise.resolve(undefined);
  }, [run]);

  const reset = useCallback(() => {
    seq.current += 1; // 丢弃进行中的结果
    hasDataRef.current = false;
    setData(undefined);
    setError(undefined);
    setLoading(false);
    setPending(false);
  }, []);

  useEffect(() => {
    if (immediate) void run(...([] as unknown as TArgs));
    // 仅在挂载时执行一次；参数变化由调用方通过 run 显式触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate]);

  return { data, error, loading, pending, run, refetch, reset, setData };
}

/** intervalMs 不足 1000 视为关闭轮询 */
export function usePolling(callback: () => void | Promise<unknown>, intervalMs: number) {
  const saved = useRef(callback);
  // 回调走 ref，interval 只按 intervalMs 建一次，不随父组件重渲染重建
  saved.current = callback;

  useEffect(() => {
    if (!intervalMs || intervalMs < 1000) return;
    const timer = setInterval(() => {
      // 页面不可见时不打接口，省流量也避免后台标签页堆积
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void saved.current();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
}

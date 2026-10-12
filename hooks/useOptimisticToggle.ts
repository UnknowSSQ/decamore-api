'use client';
/**
 * 列表行开关的公共逻辑：先写本地状态让 Switch 不等 RTT，请求失败再退回原值。
 * 接口管理与访问规则两边原先各抄了一份约 35 行的同款代码，收在这里。
 */
import { useCallback, useRef, useState } from 'react';

import { useToast } from './useToast';
import type { Paged } from '@/types';

interface OptimisticToggleOptions<TRow extends { id: string }> {
  setData: (updater: (prev: Paged<TRow> | undefined) => Paged<TRow> | undefined) => void;
  /** 把界面上的开/关映射成这一行要写的字段 */
  toPatch: (next: boolean) => Partial<TRow>;
  /** 返回服务端确认后的整行：本地 patch 只知道自己改了哪几个字段，updatedAt / hitsToday 这类派生值得以响应为准 */
  persist: (id: string, patch: Partial<TRow>) => Promise<TRow>;
  successMessage: (row: TRow, next: boolean) => string;
}

export function useOptimisticToggle<TRow extends { id: string }>(options: OptimisticToggleOptions<TRow>) {
  const toast = useToast();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const refs = useRef(options);
  refs.current = options;

  const write = useCallback((id: string, patch: Partial<TRow>) => {
    refs.current.setData((prev) => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) };
    });
  }, []);

  const toggle = useCallback(
    async (row: TRow, next: boolean) => {
      const current = refs.current;
      const patch = current.toPatch(next);
      // 只回滚 patch 涉及的那几个字段，其它行的并发编辑不会被整对象覆盖掉
      const before = Object.fromEntries(
        Object.keys(patch).map((key) => [key, (row as Record<string, unknown>)[key]]),
      ) as Partial<TRow>;

      setTogglingId(row.id);
      write(row.id, patch);
      try {
        const saved = await current.persist(row.id, patch);
        // 用服务端那一行覆盖：乐观值只是过渡，成功后以确认结果为准
        write(row.id, saved);
        toast.success(current.successMessage(row, next));
      } catch {
        write(row.id, before);
        toast.error('状态更新失败');
      } finally {
        setTogglingId(null);
      }
    },
    [toast, write],
  );

  return { togglingId, toggle };
}

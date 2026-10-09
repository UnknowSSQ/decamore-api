'use client';
/** 后台模态表单的公共外壳：打开时按当前编辑项初始化、软校验出逐字段错误、提交并回报结果 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ZodTypeAny } from 'zod';

import { useToast } from './useToast';
import { toFirstIssueMap, validateSoft } from '@/lib/zod/validate-shared';

export interface ModalFormOptions<TValues extends object, TOutput> {
  open: boolean;
  /** 编辑对象；null 表示新建 */
  editing: object | null;
  /** 每次打开都重新算初值，所以允许按 editing 分支取字段（别把 id 之类的额外字段漏进 values） */
  initial: (editing: object | null) => TValues;
  schema: ZodTypeAny;
  /** 校验与提交前对值做一次归一化（如补前导斜杠），保证「校验的内容」和「发出的内容」一致 */
  prepare?: (values: TValues) => TValues;
  submit: (value: TOutput) => Promise<unknown>;
  successMessage: (editing: boolean) => string;
  failureMessage: (editing: boolean) => string;
  /** 提交成功后由调用方决定是刷新列表还是关掉自己 */
  onSaved: () => void;
}

export interface ModalForm<TValues> {
  values: TValues;
  /** 改动某字段时顺手清掉它自己的错误，不用整表重校验 */
  setValue: <K extends keyof TValues>(key: K, value: TValues[K]) => void;
  errors: Record<string, string>;
  pending: boolean;
  handleSubmit: () => Promise<void>;
}

export function useModalForm<TValues extends object, TOutput>(
  options: ModalFormOptions<TValues, TOutput>,
): ModalForm<TValues> {
  const toast = useToast();
  const [values, setValues] = useState<TValues>(() => options.initial(options.editing));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  // 这几个都从 ref 读：调用方每次渲染都传新函数，进依赖会让 effect 每帧重跑并清空用户输入
  const refs = useRef(options);
  refs.current = options;

  const { open, editing } = options;
  useEffect(() => {
    if (!open) return;
    setValues(refs.current.initial(editing));
    setErrors({});
  }, [open, editing]);

  const setValue = useCallback(<K extends keyof TValues>(key: K, value: TValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const field = String(key);
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    const current = refs.current;
    const payload = current.prepare ? current.prepare(values) : values;
    const result = validateSoft(current.schema, payload);
    if (!result.ok) {
      setErrors(toFirstIssueMap(result.issues));
      return;
    }

    setPending(true);
    try {
      await current.submit(result.value as TOutput);
      toast.success(current.successMessage(!!current.editing));
      current.onSaved();
    } catch {
      toast.error(current.failureMessage(!!current.editing));
    } finally {
      setPending(false);
    }
  }, [values, toast]);

  return { values, setValue, errors, pending, handleSubmit };
}

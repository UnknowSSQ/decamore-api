'use client';
/** 后台「新建」表单的公共外壳：每次打开重置初值、软校验出逐字段错误、提交并回报结果 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ZodTypeAny } from 'zod';

import { useToast } from './useToast';
import { toFirstIssueMap, validateSoft } from '@/lib/zod/validate-shared';

interface ModalFormOptions<TValues, TOutput> {
  open: boolean;
  /** 每次打开都重新算初值，所以允许按调用方的上下文取（别把 id 之类的额外字段铺进 values） */
  initial: () => TValues;
  schema: ZodTypeAny;
  /** 校验与提交前对值做一次归一化（如补前导斜杠），保证「校验的内容」和「发出的内容」一致 */
  prepare?: (values: TValues) => TValues;
  submit: (value: TOutput) => Promise<unknown>;
  successMessage: string;
  failureMessage: string;
  /** 提交成功后由调用方决定是刷新列表还是关掉自己 */
  onSaved: () => void;
}

interface ModalForm<TValues> {
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
  const [values, setValues] = useState<TValues>(() => options.initial());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  // 这几个都从 ref 读：调用方每次渲染都传新函数，进依赖会让 effect 每帧重跑并清空用户输入
  const refs = useRef(options);
  refs.current = options;

  const { open } = options;
  useEffect(() => {
    if (!open) return;
    setValues(refs.current.initial());
    setErrors({});
  }, [open]);

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
      toast.success(current.successMessage);
      current.onSaved();
    } catch {
      toast.error(current.failureMessage);
    } finally {
      setPending(false);
    }
  }, [values, toast]);

  return { values, setValue, errors, pending, handleSubmit };
}

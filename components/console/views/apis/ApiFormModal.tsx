'use client';
import { useEffect, useState } from 'react';

import { Button, Field, Input, Modal, Select, Switch } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { createManagedApi, updateManagedApi } from '@/lib/api';
import { createApiSchema } from '@/lib/zod/admin.schema';
import { validateSoft } from '@/lib/zod/validate-shared';
import type { ManagedApi } from '@/types';

export interface ApiFormModalProps {
  open: boolean;
  onClose: () => void;
  editingApi: ManagedApi | null;
  onSuccess: () => void;
}

const METHOD_OPTIONS = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
];

const CATEGORY_OPTIONS = [
  { value: '内容', label: '内容' },
  { value: '数据', label: '数据' },
  { value: '图片', label: '图片' },
];

export function ApiFormModal({ open, onClose, editingApi, onSuccess }: ApiFormModalProps) {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState('');
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('');
  const [category, setCategory] = useState('内容');
  const [description, setDescription] = useState('');
  const [authRequired, setAuthRequired] = useState(false);
  const [rateLimited, setRateLimited] = useState(true);

  // 依赖 open：关闭再打开时按当前 editingApi 重新填充，不残留上一次的输入
  useEffect(() => {
    if (editingApi) {
      setName(editingApi.name);
      setMethod(editingApi.method);
      setPath(editingApi.path);
      setCategory(editingApi.category);
      setDescription(''); // ManagedApi 类型不含 description，编辑时留空
      setAuthRequired(editingApi.authRequired);
      setRateLimited(editingApi.rateLimited);
    } else {
      setName('');
      setMethod('GET');
      setPath('');
      setCategory('内容');
      setDescription('');
      setAuthRequired(false);
      setRateLimited(true);
    }
    setErrors({});
  }, [editingApi, open]);

  const handleSubmit = async () => {
    // 前导斜杠允许省略，提交前补齐
    const payload = {
      name,
      method,
      path: path.startsWith('/') ? path : `/${path}`,
      category,
      description,
      authRequired,
      rateLimited,
    };

    const result = validateSoft(createApiSchema, payload);
    if (!result.ok) {
      const errMap: Record<string, string> = {};
      for (const issue of result.issues) {
        // 同一字段只留第一条
        if (!errMap[issue.field]) errMap[issue.field] = issue.message;
      }
      setErrors(errMap);
      return;
    }

    setPending(true);
    try {
      if (editingApi) {
        // create 校验出的值直接 PATCH，类型差异靠 cast 对齐
        await updateManagedApi(editingApi.id, result.value as Parameters<typeof updateManagedApi>[1]);
        toast.success('接口已更新');
      } else {
        await createManagedApi(result.value);
        toast.success('接口已创建');
      }
      onSuccess();
      onClose();
    } catch {
      toast.error(editingApi ? '更新失败' : '创建失败');
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingApi ? '编辑接口' : '注册新接口'}
      description={editingApi ? `正在编辑 ${editingApi.name}` : '填写接口基本信息'}
      width="max-w-[520px]"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            取消
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={pending}>
            {editingApi ? '保存' : '创建'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="接口名称" required error={errors.name}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：一言"
            invalid={!!errors.name}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="方法" required>
            <Select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              options={METHOD_OPTIONS}
            />
          </Field>
          <Field label="分类" required>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={CATEGORY_OPTIONS}
            />
          </Field>
        </div>

        <Field label="路径" required error={errors.path}>
          <Input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/api/v1/hitokoto"
            invalid={!!errors.path}
          />
        </Field>

        <Field label="描述">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="接口能力简述"
          />
        </Field>

        <div className="flex flex-col gap-3 rounded-lg border border-line bg-bg-soft/40 p-3">
          <Switch
            checked={authRequired}
            onChange={setAuthRequired}
            label="需要鉴权"
          />
          <Switch
            checked={rateLimited}
            onChange={setRateLimited}
            label="启用限流"
          />
        </div>
      </div>
    </Modal>
  );
}

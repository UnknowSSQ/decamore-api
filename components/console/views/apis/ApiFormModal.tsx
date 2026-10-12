'use client';
import { Button, Field, Input, Modal, Select } from '@/components/ui';
import { useModalForm } from '@/hooks/useModalForm';
import { createManagedApi } from '@/lib/api';
import { createApiSchema, type CreateApiInput } from '@/lib/zod/admin.schema';
import { API_CATEGORIES, type ApiCategory, type HttpMethod } from '@/types';

export interface ApiFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const METHOD_OPTIONS = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
];

/** 分类就是领域里那三个，不再手写一遍带 label 的清单 */
const CATEGORY_OPTIONS = API_CATEGORIES.map((category) => ({ value: category, label: category }));

interface ApiFormValues {
  name: string;
  method: HttpMethod;
  path: string;
  category: ApiCategory;
  description: string;
}

const BLANK: ApiFormValues = {
  name: '',
  method: 'GET',
  path: '',
  category: '内容',
  description: '',
};

export function ApiFormModal({ open, onClose, onSuccess }: ApiFormModalProps) {
  const { values, setValue, errors, pending, handleSubmit } = useModalForm<ApiFormValues, CreateApiInput>({
    open,
    initial: () => BLANK,
    schema: createApiSchema,
    // 前导斜杠可以省，但校验和提交必须看到同一个值，所以放在 prepare 里
    prepare: (v) => ({ ...v, path: v.path.startsWith('/') ? v.path : `/${v.path}` }),
    submit: (value) => createManagedApi(value),
    successMessage: '接口已创建',
    failureMessage: '创建失败',
    onSaved: () => {
      onSuccess();
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="注册新接口"
      description="填写接口基本信息"
      width="max-w-[520px]"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            取消
          </Button>
          <Button variant="primary" onClick={() => void handleSubmit()} loading={pending}>
            创建
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="接口名称" required error={errors.name}>
          <Input
            value={values.name}
            onChange={(e) => setValue('name', e.target.value)}
            placeholder="例如：一言"
            invalid={!!errors.name}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="方法" required>
            <Select
              value={values.method}
              onChange={(e) => setValue('method', e.target.value as HttpMethod)}
              options={METHOD_OPTIONS}
            />
          </Field>
          <Field label="分类" required>
            <Select
              value={values.category}
              onChange={(e) => setValue('category', e.target.value as ApiCategory)}
              options={CATEGORY_OPTIONS}
            />
          </Field>
        </div>

        <Field label="路径" required error={errors.path}>
          <Input
            value={values.path}
            onChange={(e) => setValue('path', e.target.value)}
            placeholder="/api/v1/hitokoto"
            invalid={!!errors.path}
          />
        </Field>

        <Field label="描述" error={errors.description}>
          <Input
            value={values.description}
            onChange={(e) => setValue('description', e.target.value)}
            placeholder="接口能力简述"
            invalid={!!errors.description}
          />
        </Field>
      </div>
    </Modal>
  );
}

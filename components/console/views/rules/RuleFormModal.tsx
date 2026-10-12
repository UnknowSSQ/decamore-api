'use client';
import { Button, Field, Input, Modal, Select, Switch } from '@/components/ui';
import { useModalForm } from '@/hooks/useModalForm';
import { createRule } from '@/lib/api';
import { createRuleSchema, type CreateRuleInput } from '@/lib/zod/admin.schema';

export interface RuleFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ACTION_OPTIONS = [
  { value: '429', label: '限流 · 429' },
  { value: 'reject', label: '拦截 · reject' },
  { value: 'log', label: '日志 · log' },
] as const;

type RuleAction = (typeof ACTION_OPTIONS)[number]['value'];

interface RuleFormValues {
  name: string;
  scope: string;
  limit: number;
  periodSec: number;
  action: RuleAction;
  enabled: boolean;
}

const BLANK: RuleFormValues = { name: '', scope: '', limit: 3000, periodSec: 60, action: '429', enabled: true };

export function RuleFormModal({ open, onClose, onSuccess }: RuleFormModalProps) {
  const { values, setValue, errors, pending, handleSubmit } = useModalForm<RuleFormValues, CreateRuleInput>({
    open,
    initial: () => BLANK,
    schema: createRuleSchema,
    submit: (value) => createRule(value),
    successMessage: '规则已创建',
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
      title="新建规则"
      description="配置流量治理规则"
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
        <Field label="规则名称" required error={errors.name}>
          <Input
            value={values.name}
            onChange={(e) => setValue('name', e.target.value)}
            placeholder="例如：热点接口频控"
            invalid={!!errors.name}
          />
        </Field>

        <Field label="匹配目标（作用域）" required error={errors.scope}>
          <Input
            value={values.scope}
            onChange={(e) => setValue('scope', e.target.value)}
            placeholder="/api/v1/hotsearch 或 来源 45.128.88.0/24"
            invalid={!!errors.scope}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="阈值（次）" required error={errors.limit}>
            <Input
              type="number"
              value={String(values.limit)}
              onChange={(e) => setValue('limit', Number(e.target.value))}
              placeholder="3000"
              invalid={!!errors.limit}
            />
          </Field>
          <Field label="周期（秒）" required error={errors.periodSec}>
            <Input
              type="number"
              value={String(values.periodSec)}
              onChange={(e) => setValue('periodSec', Number(e.target.value))}
              placeholder="60"
              invalid={!!errors.periodSec}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="动作类型" required>
            <Select
              value={values.action}
              onChange={(e) => setValue('action', e.target.value as RuleAction)}
              options={ACTION_OPTIONS}
            />
          </Field>
          <div className="flex items-end pb-6">
            <Switch
              checked={values.enabled}
              onChange={(v) => setValue('enabled', v)}
              label={values.enabled ? '启用' : '停用'}
            />
          </div>
        </div>

        {errors.limit && <p className="text-[11.5px] text-danger">{errors.limit}</p>}
      </div>
    </Modal>
  );
}

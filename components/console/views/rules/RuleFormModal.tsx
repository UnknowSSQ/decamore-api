'use client';
import { useEffect, useState } from 'react';

import { Button, Field, Input, Modal, Select, Switch } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { createRule, updateRule } from '@/lib/api';
import { createRuleSchema } from '@/lib/zod/admin.schema';
import { validateSoft } from '@/lib/zod/validate-shared';
import type { AccessRule } from '@/types';

export interface RuleFormModalProps {
  open: boolean;
  onClose: () => void;
  editingRule: AccessRule | null;
  onSuccess: () => void;
}

const ACTION_OPTIONS = [
  { value: '429', label: '限流 · 429' },
  { value: 'reject', label: '拦截 · reject' },
  { value: 'captcha', label: '缓存 · captcha' },
  { value: 'log', label: '日志 · log' },
];

export function RuleFormModal({ open, onClose, editingRule, onSuccess }: RuleFormModalProps) {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState('');
  const [scope, setScope] = useState('');
  const [limit, setLimit] = useState(3000);
  const [periodSec, setPeriodSec] = useState(60);
  const [action, setAction] = useState<'429' | 'reject' | 'captcha' | 'log'>('429');
  const [enabled, setEnabled] = useState(true);

  // 依赖 open：关闭再打开时按当前 editingRule 重新填充
  useEffect(() => {
    if (editingRule) {
      setName(editingRule.name);
      setScope(editingRule.scope);
      setLimit(editingRule.limit);
      setPeriodSec(editingRule.periodSec);
      setAction(editingRule.action);
      setEnabled(editingRule.enabled);
    } else {
      setName('');
      setScope('');
      setLimit(3000);
      setPeriodSec(60);
      setAction('429');
      setEnabled(true);
    }
    setErrors({});
  }, [editingRule, open]);

  const handleSubmit = async () => {
    const payload = { name, scope, limit, periodSec, action, enabled };

    const result = validateSoft(createRuleSchema, payload);
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
      if (editingRule) {
        await updateRule(editingRule.id, result.value);
        toast.success('规则已更新');
      } else {
        await createRule(result.value);
        toast.success('规则已创建');
      }
      onSuccess();
      onClose();
    } catch {
      toast.error(editingRule ? '更新失败' : '创建失败');
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingRule ? '编辑规则' : '新建规则'}
      description={editingRule ? `正在编辑 ${editingRule.name}` : '配置流量治理规则'}
      width="max-w-[520px]"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            取消
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={pending}>
            {editingRule ? '保存' : '创建'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="规则名称" required error={errors.name}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：热点接口频控"
            invalid={!!errors.name}
          />
        </Field>

        <Field label="匹配目标（作用域）" required error={errors.scope}>
          <Input
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="/api/v1/hotsearch 或 来源 45.128.88.0/24"
            invalid={!!errors.scope}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="阈值（次）" required error={errors.limit}>
            <Input
              type="number"
              value={String(limit)}
              onChange={(e) => setLimit(Number(e.target.value))}
              placeholder="3000"
              invalid={!!errors.limit}
            />
          </Field>
          <Field label="周期（秒）" required error={errors.periodSec}>
            <Input
              type="number"
              value={String(periodSec)}
              onChange={(e) => setPeriodSec(Number(e.target.value))}
              placeholder="60"
              invalid={!!errors.periodSec}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="动作类型" required>
            <Select
              value={action}
              onChange={(e) => setAction(e.target.value as '429' | 'reject' | 'captcha' | 'log')}
              options={ACTION_OPTIONS}
            />
          </Field>
          <div className="flex items-end pb-6">
            <Switch
              checked={enabled}
              onChange={setEnabled}
              label={enabled ? '启用' : '停用'}
            />
          </div>
        </div>

        {errors.limit && (
          <p className="text-[11.5px] text-danger">{errors.limit}</p>
        )}
      </div>
    </Modal>
  );
}

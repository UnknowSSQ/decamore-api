/** mock 规则表只读：PATCH 的合并结果与 DELETE 都不回写，重新 GET 仍是原值 */
import { defineRoute, ok, noContent, NotFoundError } from '@/lib/server';
import { idParamSchema, updateRuleSchema } from '@/lib/zod/admin.schema';
import { findRuleById } from '@/lib/server/mock/rules';
import { PERMISSIONS } from '@/constants/auth';

export const GET = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.ruleRead,
    params: idParamSchema,
    route: '/api/v1/rules/[id]',
  },
  (_req, { params }) => {
    const { id } = params as { id: string };
    const rule = findRuleById(id);
    if (!rule) throw new NotFoundError('规则不存在');
    return ok(rule);
  },
);

export const PATCH = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.ruleWrite,
    params: idParamSchema,
    body: updateRuleSchema,
    route: '/api/v1/rules/[id]',
  },
  async (_req, { params, body }) => {
    const { id } = params as { id: string };
    const rule = findRuleById(id);
    if (!rule) throw new NotFoundError('规则不存在');

    const updated = { ...rule, ...body, updatedAt: new Date().toISOString() };
    return ok(updated, { message: '规则已更新' });
  },
);

export const DELETE = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.ruleWrite,
    params: idParamSchema,
    route: '/api/v1/rules/[id]',
  },
  async (_req, { params }) => {
    const { id } = params as { id: string };
    const rule = findRuleById(id);
    if (!rule) throw new NotFoundError('规则不存在');

    return noContent();
  },
);

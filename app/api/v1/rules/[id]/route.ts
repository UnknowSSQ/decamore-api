/** 规则表与运行时守卫读同一份 store，PATCH/DELETE 直接回写 */
import { defineRoute, ok, noContent, NotFoundError } from '@/lib/server';
import { idParamSchema, updateRuleSchema } from '@/lib/zod/admin.schema';
import { deleteRule, findRuleById, updateRule } from '@/lib/server/mock/rules';
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
  (_req, { params, body }) => {
    const { id } = params as { id: string };
    const updated = updateRule(id, body!);
    if (!updated) throw new NotFoundError('规则不存在');
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
  (_req, { params }) => {
    const { id } = params as { id: string };
    if (!deleteRule(id)) throw new NotFoundError('规则不存在');

    return noContent();
  },
);

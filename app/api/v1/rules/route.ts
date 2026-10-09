/** 规则表就是运行时守卫读的同一份 store，后台改动当场生效 */
import { defineRoute, ok, created, paged } from '@/lib/server';
import { ruleListQuerySchema, createRuleSchema } from '@/lib/zod/admin.schema';
import { createRule, findAllRules } from '@/lib/server/mock/rules';
import { PERMISSIONS } from '@/constants/auth';
import type { AccessRule } from '@/types';

export const GET = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.ruleRead,
    query: ruleListQuerySchema,
    route: '/api/v1/rules',
  },
  (_req, { query }) => {
    const { page, pageSize, keyword, enabled, action, sort, order } = query!;

    let items = findAllRules();

    if (keyword) {
      const kw = keyword.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(kw));
    }

    if (enabled !== undefined) items = items.filter((i) => i.enabled === enabled);

    if (action) items = items.filter((i) => i.action === action);

    const comparators: Record<typeof sort, (a: AccessRule, b: AccessRule) => number> = {
      hitsToday: (a, b) => a.hitsToday - b.hitsToday,
      limit: (a, b) => a.limit - b.limit,
      updatedAt: (a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt),
    };
    const compare = comparators[sort];
    items.sort((a, b) => (order === 'asc' ? compare(a, b) : -compare(a, b)));

    const total = items.length;
    const start = (page - 1) * pageSize;
    const paged_items = items.slice(start, start + pageSize);

    return ok(paged(paged_items, total, page, pageSize));
  },
);

export const POST = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.ruleWrite,
    body: createRuleSchema,
    route: '/api/v1/rules',
  },
  (_req, { body }) => created(createRule(body!), { message: '规则已创建' }),
);

/** 规则来自 mock 表：POST 只回显新建结果，列表接口读不到它 */
import { defineRoute, ok, created, paged } from '@/lib/server';
import { ruleListQuerySchema, createRuleSchema } from '@/lib/zod/admin.schema';
import { findAllRules } from '@/lib/server/mock/rules';
import { PERMISSIONS } from '@/constants/auth';

export const GET = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.ruleRead,
    query: ruleListQuerySchema,
    route: '/api/v1/rules',
  },
  (_req, { query }) => {
    const { page, pageSize, keyword, enabled, action } = query!;

    let items = findAllRules();

    if (keyword) {
      const kw = keyword.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(kw));
    }

    if (enabled !== undefined) items = items.filter((i) => i.enabled === enabled);

    if (action) items = items.filter((i) => i.action === action);

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
  async (_req, { body }) => {
    const data = body!;

    const newRule = {
      id: `rule_${Date.now()}`,
      ...data,
      hitsToday: 0,
      updatedAt: new Date().toISOString(),
    };

    return created(newRule, { message: '规则已创建' });
  },
);

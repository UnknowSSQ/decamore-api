import { defineRoute, ok, created, paged } from '@/lib/server';
import { apiListQuerySchema, createApiSchema } from '@/lib/zod/admin.schema';
import { createCatalogItem, listManagedApis } from '@/lib/server/catalog';
import { PERMISSIONS } from '@/constants/auth';
import type { ManagedApi } from '@/types';

export const GET = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.apiRead,
    query: apiListQuerySchema,
    route: '/api/v1/apis',
  },
  (_req, { query }) => {
    const { page, pageSize, keyword, category, method, status, sort, order } = query!;

    let items = listManagedApis();

    if (keyword) {
      const kw = keyword.toLowerCase();
      items = items.filter(
        (i) => i.name.toLowerCase().includes(kw) || i.path.toLowerCase().includes(kw),
      );
    }

    if (category) items = items.filter((i) => i.category === category);

    if (method) items = items.filter((i) => i.method === method);

    if (status) items = items.filter((i) => i.status === status);

    // sort 是查询侧的别名（calls/latency/...），与 ManagedApi 的字段名不同，只能显式建映射
    const comparators: Record<typeof sort, (a: ManagedApi, b: ManagedApi) => number> = {
      calls: (a, b) => a.calls24h - b.calls24h,
      latency: (a, b) => a.avgLatencyMs - b.avgLatencyMs,
      errorRate: (a, b) => a.errorRate - b.errorRate,
      updated: (a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt),
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
    permission: PERMISSIONS.apiWrite,
    body: createApiSchema,
    route: '/api/v1/apis',
  },
  async (_req, { body }) => {
    const data = body!;

    const newApi = createCatalogItem(data);
    return created(newApi, { message: '接口已创建' });
  },
);

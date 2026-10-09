import { defineRoute, ok, created, paged } from '@/lib/server';
import { apiListQuerySchema, createApiSchema } from '@/lib/zod/admin.schema';
import { createCatalogItem, listManagedApis } from '@/lib/server/catalog';
import { PERMISSIONS } from '@/constants/auth';

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

    // 仅 sort=errorRate 与记录字段同名，其余取到 undefined，保持车单原序
    items.sort((a, b) => {
      const va = a[sort as keyof typeof a];
      const vb = b[sort as keyof typeof b];
      if (typeof va === 'number' && typeof vb === 'number') {
        return order === 'asc' ? va - vb : vb - va;
      }
      return 0;
    });

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

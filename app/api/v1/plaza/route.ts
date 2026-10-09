import { defineRoute, ok } from '@/lib/server';
import { plazaQuerySchema } from '@/lib/zod/public.schema';
import { listCatalogItems } from '@/lib/server/catalog';
import { rankCatalog } from '@/utils/search';

export const GET = defineRoute(
  {
    auth: false,
    query: plazaQuerySchema,
    route: '/api/v1/plaza',
  },
  (_req, { query }) => {
    const { keyword, category, method } = query!;

    let items = listCatalogItems();

    // rankCatalog 已按 category 过滤，所以无关键词时才走下面的分类分支
    if (keyword) {
      const ranked = rankCatalog(items, keyword, category);
      items = ranked.map((r) => r.item);
    } else if (category) {
      items = items.filter((i) => i.cat === category);
    }

    if (method) {
      items = items.filter((i) => i.method === method);
    }

    return ok({ items, total: items.length });
  },
);

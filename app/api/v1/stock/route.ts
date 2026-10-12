/**
 * GET /api/v1/stock — 腾讯行情（公开）
 * `codes` 是逗号分隔的「市场前缀 + 代码」，最多 20 个。不缓存：给旧价不如给慢价。
 */
import { API } from '@/lib/api/endpoints';
import { defineRoute, preflight, publicOk } from '@/lib/server';
import { getStockQuotes } from '@/lib/server/stock';
import { stockQuerySchema } from '@/lib/zod/public.schema';

export const GET = defineRoute(
  {
    auth: false,
    envelope: 'public',
    query: stockQuerySchema,
    route: API.publicApi.stock,
  },
  async (_req, { query }) => publicOk(await getStockQuotes(query?.codes ?? [])),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

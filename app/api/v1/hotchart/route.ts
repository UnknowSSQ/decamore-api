import { defineRoute, preflight, publicOk } from '@/lib/server';
import { HOT_CHART_CACHE_TTL_MS, getHotChart } from '@/lib/server/hotchart';
import { hotchartQuerySchema } from '@/lib/zod/public.schema';

export const GET = defineRoute(
  {
    auth: false,
    query: hotchartQuerySchema,
    route: '/api/v1/hotchart',
  },
  async (_req, { query }) => publicOk(await getHotChart(query?.limit), { cacheSeconds: HOT_CHART_CACHE_TTL_MS / 1000 }),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

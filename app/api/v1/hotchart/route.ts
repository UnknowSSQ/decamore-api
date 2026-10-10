import { defineRoute, preflight, publicOk } from '@/lib/server';
import { getHotChart } from '@/lib/server/hotchart';
import { hotchartQuerySchema } from '@/lib/zod/public.schema';

export const GET = defineRoute(
  {
    auth: false,
    query: hotchartQuerySchema,
    route: '/api/v1/hotchart',
  },
  async (_req, { query }) => publicOk(await getHotChart(query?.limit)),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

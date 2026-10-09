import { defineRoute, publicOk } from '@/lib/server';
import { DEFAULT_HOT_SEARCH_PLATFORM, getHotSearch } from '@/lib/server/hotsearch';
import { hotsearchQuerySchema } from '@/lib/zod/admin.schema';

export const GET = defineRoute(
  {
    auth: false,
    query: hotsearchQuerySchema,
    route: '/api/v1/hotsearch',
  },
  async (_req, { query }) => publicOk(await getHotSearch(query?.platform ?? DEFAULT_HOT_SEARCH_PLATFORM)),
);

import { defineRoute, preflight, publicOk } from '@/lib/server';
import { DEFAULT_HOT_SEARCH_PLATFORM, HOT_SEARCH_CACHE_TTL_MS, getHotSearch } from '@/lib/server/hotsearch';
import { hotsearchQuerySchema } from '@/lib/zod/public.schema';

export const GET = defineRoute(
  {
    auth: false,
    envelope: 'public',
    query: hotsearchQuerySchema,
    route: '/api/v1/hotsearch',
  },
  async (_req, { query }) => publicOk(await getHotSearch(query?.platform ?? DEFAULT_HOT_SEARCH_PLATFORM, query?.limit), { cacheSeconds: HOT_SEARCH_CACHE_TTL_MS / 1000 }),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

import { defineRoute, preflight, publicOk } from '@/lib/server';
import { DEFAULT_HOT_PLAY_TYPE, getHotPlay } from '@/lib/server/hotplay';
import { hotplayQuerySchema } from '@/lib/zod/public.schema';

export const GET = defineRoute(
  {
    auth: false,
    query: hotplayQuerySchema,
    route: '/api/v1/hotplay',
  },
  async (_req, { query }) => publicOk(await getHotPlay(query?.type ?? DEFAULT_HOT_PLAY_TYPE, query?.limit)),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

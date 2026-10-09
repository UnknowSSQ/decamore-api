import { defineRoute, publicOk } from '@/lib/server';
import { DEFAULT_HOT_PLAY_TYPE, getHotPlay } from '@/lib/server/hotplay';
import { hotplayQuerySchema } from '@/lib/zod/admin.schema';

export const GET = defineRoute(
  {
    auth: false,
    query: hotplayQuerySchema,
    route: '/api/v1/hotplay',
  },
  async (_req, { query }) => publicOk(await getHotPlay(query?.type ?? DEFAULT_HOT_PLAY_TYPE)),
);

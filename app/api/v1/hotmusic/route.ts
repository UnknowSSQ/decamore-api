import { defineRoute, publicOk } from '@/lib/server';
import { DEFAULT_HOT_MUSIC_PLATFORM, getHotMusic } from '@/lib/server/hotmusic';
import { hotmusicQuerySchema } from '@/lib/zod/admin.schema';

export const GET = defineRoute(
  {
    auth: false,
    query: hotmusicQuerySchema,
    route: '/api/v1/hotmusic',
  },
  async (_req, { query }) => publicOk(await getHotMusic(query?.platform ?? DEFAULT_HOT_MUSIC_PLATFORM)),
);

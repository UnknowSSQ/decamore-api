import { defineRoute, preflight, publicOk } from '@/lib/server';
import { DEFAULT_HOT_MUSIC_PLATFORM, getHotMusic } from '@/lib/server/hotmusic';
import { hotmusicQuerySchema } from '@/lib/zod/public.schema';

export const GET = defineRoute(
  {
    auth: false,
    query: hotmusicQuerySchema,
    route: '/api/v1/hotmusic',
  },
  async (_req, { query }) => publicOk(await getHotMusic(query?.platform ?? DEFAULT_HOT_MUSIC_PLATFORM)),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

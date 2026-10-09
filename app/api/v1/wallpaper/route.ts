import { defineRoute, preflight, publicOk } from '@/lib/server';
import { pickWallpaper } from '@/lib/server/wallpaper';
import { wallpaperQuerySchema } from '@/lib/zod/public.schema';

export const GET = defineRoute(
  {
    auth: false,
    query: wallpaperQuerySchema,
    route: '/api/v1/wallpaper',
  },
  async (_req, { query }) => publicOk(await pickWallpaper(query?.type)),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

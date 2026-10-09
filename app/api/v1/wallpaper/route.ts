import { defineRoute, publicOk } from '@/lib/server';
import { pickWallpaper } from '@/lib/server/wallpaper';
import { wallpaperQuerySchema } from '@/lib/zod/admin.schema';

export const GET = defineRoute(
  {
    auth: false,
    query: wallpaperQuerySchema,
    route: '/api/v1/wallpaper',
  },
  async (_req, { query }) => publicOk(await pickWallpaper(query?.type)),
);

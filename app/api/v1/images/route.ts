import { defineRoute, preflight, publicOk } from '@/lib/server';
import { listAssets } from '@/lib/server/static-assets';
import { IMAGE_TYPES, imageQuerySchema } from '@/lib/zod/public.schema';

export const GET = defineRoute(
  {
    auth: false,
    envelope: 'public',
    query: imageQuerySchema,
    route: '/api/v1/images',
  },
  async (_req, { query }) => publicOk(await listAssets('images', query.type, IMAGE_TYPES, query.limit)),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

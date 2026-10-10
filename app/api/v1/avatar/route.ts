import { defineRoute, preflight, publicOk } from '@/lib/server';
import { listAssets } from '@/lib/server/static-assets';
import { AVATAR_TYPES, avatarQuerySchema } from '@/lib/zod/public.schema';

export const GET = defineRoute(
  {
    auth: false,
    query: avatarQuerySchema,
    route: '/api/v1/avatar',
  },
  async (_req, { query }) => publicOk(await listAssets('avatar', query.type, AVATAR_TYPES, query.limit)),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

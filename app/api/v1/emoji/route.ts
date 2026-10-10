import { defineRoute, preflight, publicOk } from '@/lib/server';
import { listAssets } from '@/lib/server/static-assets';
import { EMOJI_TYPES, emojiQuerySchema } from '@/lib/zod/public.schema';

export const GET = defineRoute(
  {
    auth: false,
    query: emojiQuerySchema,
    route: '/api/v1/emoji',
  },
  async (_req, { query }) => publicOk(await listAssets('emoji', query.type, EMOJI_TYPES, query.limit)),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

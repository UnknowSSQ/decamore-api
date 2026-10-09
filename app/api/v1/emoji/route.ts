import { defineRoute, publicOk } from '@/lib/server';
import { listAssets } from '@/lib/server/static-assets';
import { emojiQuerySchema } from '@/lib/zod/admin.schema';
import type { EmojiType } from '@/types';

const EMOJI_TYPES: readonly EmojiType[] = ['menhera'];

export const GET = defineRoute(
  {
    auth: false,
    query: emojiQuerySchema,
    route: '/api/v1/emoji',
  },
  async (_req, { query }) => publicOk(await listAssets('emoji', query?.type as EmojiType, EMOJI_TYPES)),
);

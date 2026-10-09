import { defineRoute, publicOk } from '@/lib/server';
import { listAssets } from '@/lib/server/static-assets';
import { avatarQuerySchema } from '@/lib/zod/admin.schema';
import type { AvatarType } from '@/types';

const AVATAR_TYPES: readonly AvatarType[] = ['boy', 'girl', 'anime'];

export const GET = defineRoute(
  {
    auth: false,
    query: avatarQuerySchema,
    route: '/api/v1/avatar',
  },
  async (_req, { query }) => publicOk(await listAssets('avatar', query?.type as AvatarType, AVATAR_TYPES)),
);

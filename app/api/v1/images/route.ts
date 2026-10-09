import { defineRoute, publicOk } from '@/lib/server';
import { listAssets } from '@/lib/server/static-assets';
import { imageQuerySchema } from '@/lib/zod/admin.schema';
import type { ImageType } from '@/types';

const IMAGE_TYPES: readonly ImageType[] = ['beauty', 'pretty'];

export const GET = defineRoute(
  {
    auth: false,
    query: imageQuerySchema,
    route: '/api/v1/images',
  },
  async (_req, { query }) => publicOk(await listAssets('images', query?.type as ImageType, IMAGE_TYPES)),
);

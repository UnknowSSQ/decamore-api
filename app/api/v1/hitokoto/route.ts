import { defineRoute, publicOk } from '@/lib/server';
import { randomHitokoto } from '@/lib/server/hitokoto';

export const GET = defineRoute(
  {
    auth: false,
    route: '/api/v1/hitokoto',
  },
  async () => publicOk(await randomHitokoto()),
);

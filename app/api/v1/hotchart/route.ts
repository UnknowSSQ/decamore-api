import { defineRoute, publicOk } from '@/lib/server';
import { getHotChart } from '@/lib/server/hotchart';

export const GET = defineRoute(
  {
    auth: false,
    route: '/api/v1/hotchart',
  },
  async () => publicOk(await getHotChart()),
);

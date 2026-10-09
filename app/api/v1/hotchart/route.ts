import { defineRoute, preflight, publicOk } from '@/lib/server';
import { getHotChart } from '@/lib/server/hotchart';

export const GET = defineRoute(
  {
    auth: false,
    route: '/api/v1/hotchart',
  },
  async () => publicOk(await getHotChart()),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

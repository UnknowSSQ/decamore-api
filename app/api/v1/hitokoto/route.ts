import { defineRoute, preflight, publicOk } from '@/lib/server';
import { randomHitokoto } from '@/lib/server/hitokoto';

export const GET = defineRoute(
  {
    auth: false,
    envelope: 'public',
    route: '/api/v1/hitokoto',
  },
  async () => publicOk(await randomHitokoto()),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

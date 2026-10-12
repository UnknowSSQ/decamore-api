import { defineRoute, preflight, publicOk } from '@/lib/server';
import { randomAnswer } from '@/lib/server/answerbook';

export const GET = defineRoute(
  {
    auth: false,
    envelope: 'public',
    route: '/api/v1/answerbook',
  },
  async () => publicOk(await randomAnswer()),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

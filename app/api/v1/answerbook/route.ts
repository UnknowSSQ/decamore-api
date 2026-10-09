import { defineRoute, publicOk } from '@/lib/server';
import { randomAnswer } from '@/lib/server/answerbook';

export const GET = defineRoute(
  {
    auth: false,
    route: '/api/v1/answerbook',
  },
  async () => publicOk(await randomAnswer()),
);

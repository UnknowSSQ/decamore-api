import { defineRoute, ok } from '@/lib/server';
import { markAllNotificationsRead } from '@/lib/server/mock/notifications';

export const POST = defineRoute(
  {
    auth: true,
    route: '/api/v1/notifications/read-all',
  },
  () => ok({ changed: markAllNotificationsRead() }, { message: '通知已全部标记为已读' }),
);

import { defineRoute, ok, NotFoundError } from '@/lib/server';
import { idParamSchema } from '@/lib/zod/admin.schema';
import { markNotificationRead, findAllNotifications } from '@/lib/server/mock/notifications';

export const POST = defineRoute(
  {
    auth: true,
    params: idParamSchema,
    route: '/api/v1/notifications/[id]/read',
  },
  async (_req, { params }) => {
    const { id } = params as { id: string };
    const notif = findAllNotifications().find((n) => n.id === id);
    if (!notif) throw new NotFoundError('通知不存在');

    markNotificationRead(id);
    return ok({ success: true }, { message: '已标记为已读' });
  },
);

import { defineRoute, ok, NotFoundError } from '@/lib/server';
import { idParamSchema } from '@/lib/zod/admin.schema';
import { findNotification, markNotificationRead } from '@/lib/server/mock/notifications';

export const POST = defineRoute(
  {
    auth: true,
    params: idParamSchema,
    route: '/api/v1/notifications/[id]/read',
  },
  (_req, { params }) => {
    const { id } = params as { id: string };
    if (!findNotification(id)) throw new NotFoundError('通知不存在');

    markNotificationRead(id);
    return ok({ id, read: true }, { message: '已标记为已读' });
  },
);

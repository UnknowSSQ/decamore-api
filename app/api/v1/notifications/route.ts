import { defineRoute, ok, paged } from '@/lib/server';
import { notificationQuerySchema } from '@/lib/zod/admin.schema';
import { findAllNotifications } from '@/lib/server/mock/notifications';

export const GET = defineRoute(
  {
    auth: true,
    query: notificationQuerySchema,
    route: '/api/v1/notifications',
  },
  (_req, { query }) => {
    const { page, pageSize, unreadOnly } = query!;

    let items = findAllNotifications();

    if (unreadOnly) items = items.filter((i) => !i.read);

    const total = items.length;
    const start = (page - 1) * pageSize;
    const paged_items = items.slice(start, start + pageSize);

    return ok(paged(paged_items, total, page, pageSize));
  },
);

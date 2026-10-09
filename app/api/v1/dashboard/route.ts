import { defineRoute, ok } from '@/lib/server';
import { dashboardQuerySchema } from '@/lib/zod/admin.schema';
import { getDashboardStats } from '@/lib/server/mock/dashboard';
import { PERMISSIONS } from '@/constants/auth';

export const GET = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.statsRead,
    query: dashboardQuerySchema,
    route: '/api/v1/dashboard',
  },
  (_req, { query }) => {
    const { range, live } = query!;
    void live;

    const stats = getDashboardStats(range);
    return ok(stats);
  },
);

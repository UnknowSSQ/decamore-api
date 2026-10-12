import { defineRoute, ok } from '@/lib/server';
import { dashboardQuerySchema } from '@/lib/zod/admin.schema';
import { getDashboardStats } from '@/lib/server/metrics';
import { PERMISSIONS } from '@/constants/auth';

export const GET = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.statsRead,
    query: dashboardQuerySchema,
    route: '/api/v1/dashboard',
  },
  (_req, { query }) => ok(getDashboardStats(query!.range)),
);

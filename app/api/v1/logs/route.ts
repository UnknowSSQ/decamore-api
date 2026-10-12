import { defineRoute, ok, paged } from '@/lib/server';
import { logListQuerySchema } from '@/lib/zod/admin.schema';
import { queryCallLogs } from '@/lib/server/metrics';
import { PERMISSIONS } from '@/constants/auth';
import type { CallLogPage } from '@/types';

/**
 * GET /api/v1/logs — 调用明细（控制台）
 * 取数是 lib/server/metrics 里的环形缓冲快照：筛选、排序、分页与 summary 同一批记录。
 */
export const GET = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.logRead,
    query: logListQuerySchema,
    route: '/api/v1/logs',
  },
  (_req, { query }) => {
    const { items, summary } = queryCallLogs(query!);
    const result: CallLogPage = { ...paged(items, summary.total, query!.page, query!.pageSize), summary };
    return ok(result);
  },
);

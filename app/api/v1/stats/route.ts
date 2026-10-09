/** 读的是本进程的内存环形缓冲，多实例部署各自只见自己那份，重启即清零 */
import { defineRoute, ok } from '@/lib/server';
import { recentApiCalls, aggregateApiCalls } from '@/lib/server/stats';
import { PERMISSIONS } from '@/constants/auth';

export const GET = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.statsRead,
    route: '/api/v1/stats',
  },
  () => {
    const recent = recentApiCalls(50);
    const aggregate = aggregateApiCalls();

    return ok({
      recent,
      aggregate,
      timestamp: Date.now(),
    });
  },
);

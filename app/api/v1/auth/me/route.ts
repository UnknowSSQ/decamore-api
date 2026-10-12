import { defineRoute, ok } from '@/lib/server';
import { API } from '@/lib/api/endpoints';
import { permissionsOf } from '@/lib/auth/permissions';
import type { MeResult } from '@/types';

export const GET = defineRoute(
  {
    auth: true,
    route: API.auth.me,
  },
  (_req, { session }) => {
    const { user, expiresAt } = session!;

    const result: MeResult = {
      user: {
        ...user,
        permissions: permissionsOf(user.role),
      },
      expiresAt,
      // 剩不到 1 分钟就提示客户端提前换发，避免请求撞上过期
      shouldRefresh: expiresAt - Date.now() < 60_000,
    };

    return ok(result);
  },
);

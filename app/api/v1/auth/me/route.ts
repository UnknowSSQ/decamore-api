import { defineRoute, ok } from '@/lib/server';
import { meQuerySchema } from '@/lib/zod/auth.schema';
import { permissionsOf } from '@/lib/auth/permissions';
import type { MeResult } from '@/types';

export const GET = defineRoute(
  {
    auth: true,
    query: meQuerySchema,
    route: '/api/v1/auth/me',
  },
  (_req, { session, query }) => {
    const { user, expiresAt } = session!;
    const { probe } = query!;

    const result: MeResult = {
      user: {
        ...user,
        permissions: permissionsOf(user.role),
      },
      expiresAt,
      // 剩不到 1 分钟就提示客户端提前换发，避免请求撞上过期
      shouldRefresh: expiresAt - Date.now() < 60_000,
    };

    void probe; // 仅作探活标记，服务端不使用

    return ok(result);
  },
);

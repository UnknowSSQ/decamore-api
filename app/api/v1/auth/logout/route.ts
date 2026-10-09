import { defineRoute, ok } from '@/lib/server';
import { logoutSchema } from '@/lib/zod/auth.schema';
import { clearSessionCookies } from '@/lib/auth/session';

export const POST = defineRoute(
  {
    auth: false,
    body: logoutSchema,
    route: '/api/v1/auth/logout',
  },
  async (_req, { body }) => {
    const { allDevices } = body!;

    // 令牌无状态且没有吊销表，登出只清本浏览器的 Cookie
    void allDevices;

    await clearSessionCookies();

    return ok({ success: true }, { message: '已退出登录' });
  },
);

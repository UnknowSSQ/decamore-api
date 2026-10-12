import { defineRoute, ok } from '@/lib/server';
import { API } from '@/lib/api/endpoints';
import { clearSessionCookies } from '@/lib/auth/session';

/** 令牌无状态且没有吊销表，登出只清本浏览器的 Cookie */
export const POST = defineRoute(
  {
    auth: false,
    route: API.auth.logout,
  },
  async () => {
    await clearSessionCookies();

    return ok({ success: true }, { message: '已退出登录' });
  },
);

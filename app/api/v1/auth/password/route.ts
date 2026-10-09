import { defineRoute, ok } from '@/lib/server';
import { changePasswordSchema } from '@/lib/zod/auth.schema';

export const PATCH = defineRoute(
  {
    auth: true,
    body: changePasswordSchema,
    route: '/api/v1/auth/password',
  },
  async (_req, { body, session }) => {
    const { currentPassword, newPassword } = body!;

    // 无数据源：入参不参与任何判定，接口恒返回成功，密码并未变更
    void currentPassword;
    void newPassword;

    void session;

    return ok({ success: true }, { message: '密码已更新' });
  },
);

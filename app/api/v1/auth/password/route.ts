import { defineRoute, ok, UnauthorizedError } from '@/lib/server';
import { changePasswordSchema } from '@/lib/zod/auth.schema';
import { API } from '@/lib/api/endpoints';
import { findUserByAccount, updatePassword, verifyPassword } from '@/lib/server/store/users';

export const PATCH = defineRoute(
  {
    auth: true,
    body: changePasswordSchema,
    route: API.auth.changePassword,
  },
  async (_req, { body, session }) => {
    const { currentPassword, newPassword } = body!;
    const account = session!.user.account;

    const user = findUserByAccount(account);
    if (!user || !verifyPassword(user.passwordHash, currentPassword)) {
      throw new UnauthorizedError('当前密码错误', '请确认后重试');
    }

    updatePassword(account, newPassword);

    return ok({ success: true }, { message: '密码已更新' });
  },
);

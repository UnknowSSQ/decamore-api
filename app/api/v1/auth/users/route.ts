import { defineRoute, ok, created, paged } from '@/lib/server';
import { createUserSchema } from '@/lib/zod/auth.schema';
import { paginationSchema } from '@/lib/zod/common';
import { findAllUsers } from '@/lib/server/mock/users';

export const GET = defineRoute(
  {
    auth: true,
    roles: ['admin'],
    query: paginationSchema,
    route: '/api/v1/auth/users',
  },
  (_req, { query }) => {
    const { page, pageSize } = query!;
    const users = findAllUsers();

    // 逐字段挑出可外发的部分，password 不随记录带出
    const items = users.map((u) => ({
      id: u.id,
      account: u.account,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      disabled: u.disabled,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    }));

    const total = items.length;
    const start = (page - 1) * pageSize;
    const paged_items = items.slice(start, start + pageSize);

    return ok(paged(paged_items, total, page, pageSize));
  },
);

export const POST = defineRoute(
  {
    auth: true,
    roles: ['admin'],
    body: createUserSchema,
    route: '/api/v1/auth/users',
  },
  async (_req, { body }) => {
    const { account, email, displayName, password, role } = body!;

    // 静态用户表不写入：创建结果只在响应里，GET 读不到这条记录
    void password;

    const newUser = {
      id: `usr_${Date.now()}`,
      account,
      email,
      displayName,
      role,
      disabled: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    };

    return created(newUser, { message: '用户已创建' });
  },
);

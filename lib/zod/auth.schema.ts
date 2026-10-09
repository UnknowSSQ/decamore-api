/** 前端登录表单与后端 /api/v1/auth/* 共用同一份定义 */
import { z } from 'zod';

import { accountSchema, boolish, idSchema, passwordSchema } from './common';

/** POST /api/v1/auth/login */
export const loginSchema = z
  .object({
    account: accountSchema,
    password: passwordSchema,
    /** 勾选后 refresh Cookie 存活 REMEMBER_SECONDS */
    remember: boolish.default(false),
    /** 服务端仍会按白名单二次校验 */
    redirect: z.string().trim().max(200).optional(),
    /** 预留字段，服务端不读 */
    totp: z.string().trim().length(6, '验证码为 6 位数字').optional(),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;

/** POST /api/v1/auth/refresh；token 从 httpOnly Cookie 读，body 通常为空 */
export const refreshSchema = z
  .object({
    refreshToken: z.string().trim().min(1).optional(),
  })
  .strict();

export type RefreshInput = z.infer<typeof refreshSchema>;

/** POST /api/v1/auth/logout */
export const logoutSchema = z
  .object({
    allDevices: boolish.default(false),
  })
  .strict();

export type LogoutInput = z.infer<typeof logoutSchema>;

/** GET /api/v1/auth/me 的 query */
export const meQuerySchema = z.object({
  /** 探活标记，服务端不参与逻辑 */
  probe: boolish.default(false),
});

/** 比登录密码更严：额外要求大小写字母与数字 */
export const changePasswordSchema = z
  .object({
    currentPassword: passwordSchema,
    newPassword: passwordSchema
      .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '新密码需同时包含大小写字母与数字')
      .refine((v) => !/^(.)\1+$/.test(v), '新密码不能为重复字符'),
    confirmPassword: z.string(),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '两次输入的新密码不一致',
    path: ['confirmPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const createUserSchema = z
  .object({
    account: accountSchema,
    email: z.string().trim().email('邮箱格式不正确'),
    displayName: z.string().trim().min(1, '请输入显示名').max(32),
    password: passwordSchema,
    role: z.enum(['admin']).default('admin'),
  })
  .strict();

export const idParamSchema = z.object({ id: idSchema });

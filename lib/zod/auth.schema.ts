/** 前端登录表单与后端 /api/v1/auth/* 共用同一份定义 */
import { z } from 'zod';

import { accountSchema, boolish, passwordSchema } from './common';

/** POST /api/v1/auth/login */
export const loginSchema = z
  .object({
    account: accountSchema,
    password: passwordSchema,
    /** 勾选后 refresh Cookie 存活 REMEMBER_SECONDS */
    remember: boolish.default(false),
    /** 服务端仍会按白名单二次校验 */
    redirect: z.string().trim().max(200).optional(),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;

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


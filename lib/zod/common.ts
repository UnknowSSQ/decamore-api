/** 校验规则与中文文案只写一次，前端表单复用同一份 schema 做即时校验 */
import { z } from 'zod';

/** 与 lib/auth/permissions 的 detectAccountKind 各写了一份同样的正则，改一处要同步 */
export const accountSchema = z
  .string({ required_error: '请输入管理员账号', invalid_type_error: '账号格式不正确' })
  .trim()
  .min(1, '请输入管理员账号')
  .refine(
    (value) => {
      if (value.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
      return /^[A-Za-z0-9_.-]{3,32}$/.test(value);
    },
    { message: '账号需为合法邮箱，或 3–32 位字母、数字、下划线、点' },
  );

/** 不校验复杂度，强度策略由安全配置下发 */
export const passwordSchema = z
  .string({ required_error: '请输入密码', invalid_type_error: '密码格式不正确' })
  .min(8, '密码至少 8 位')
  .max(128, '密码过长');

/** 兼容 query string 的 "true"/"false"/"1"/"0" */
export const boolish = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((v) => (typeof v === 'boolean' ? v : v === 'true' || v === '1'));

export const idSchema = z.string({ required_error: '缺少 ID' }).trim().min(1, '缺少 ID').max(64);

/** query 里是字符串，必须 coerce */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, '页码从 1 开始').max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100, '单页最多 100 条').default(12),
});

/** 取值须与仪表盘的时间 chips 一致 */
export const rangeSchema = z.enum(['24h', '7d', '30d'], {
  errorMap: () => ({ message: '时间范围仅支持 24h / 7d / 30d' }),
});
export type RangeValue = z.infer<typeof rangeSchema>;

export const ipOrCidrSchema = z
  .string()
  .trim()
  .refine((value) => {
    const v4 = /^(\d{1,3}\.){3}\d{1,3}(\/(0|[1-9]|[12]\d|3[0-2]))?$/;
    const v6 = /^[0-9a-fA-F:]+(\/(0|[1-9]\d?|1[01]\d|12[0-8]))?$/;
    if (v4.test(value)) {
      return value.split('/')[0]!.split('.').every((seg) => Number(seg) <= 255);
    }
    return v6.test(value);
  }, '请输入合法的 IPv4 / IPv6 或 CIDR 网段');

export const corsOriginSchema = z
  .string()
  .trim()
  .refine((value) => value === '*' || /^https?:\/\/[\w.-]+(:\d{2,5})?$/.test(value), '来源需为 * 或完整 http(s) 地址');

export const httpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

/** 须与 types/domain 的 ApiCategory 字面量保持一致 */
export const apiCategorySchema = z.enum(['内容', '图片', '数据']);

/** 空格换成 T，"YYYY-MM-DD HH:mm:ss" 才解析得了 */
export const datetimeSchema = z
  .string()
  .trim()
  .refine((v) => !Number.isNaN(new Date(v.replace(' ', 'T')).getTime()), { message: '时间格式不合法' });

/** 搜索关键词：限长，避免超长 query 打穿数据库 */
export const keywordSchema = z.string().trim().max(64, '搜索关键词不超过 64 字').optional();

/** 单位字节，对应安全配置里 maxBodySizeKb 的默认值 64 */
export const MAX_BODY_BYTES = 64 * 1024;

/** 控制台入参契约；前端表单复用同一份 schema，规则不会两头漂移 */
import { z } from 'zod';

import { CARD_COLS_RANGE, CARD_ROWS_RANGE } from '@/constants/card-layout';

import {
  apiCategorySchema,
  boolish,
  corsOriginSchema,
  datetimeSchema,
  httpMethodSchema,
  idSchema,
  ipOrCidrSchema,
  keywordSchema,
  paginationSchema,
  rangeSchema,
} from './common';

export const idParamSchema = z.object({ id: idSchema });

export const pagedQuerySchema = paginationSchema.extend({
  keyword: keywordSchema,
});

export const dashboardQuerySchema = z.object({
  range: rangeSchema.default('24h'),
  /** 只影响 mock 数据抖动，不改查询口径 */
  live: boolish.default(false),
});

export const exportReportBodySchema = z.object({
  range: rangeSchema.default('24h'),
  format: z.enum(['csv', 'json']).default('csv'),
  /** 未指定则全部导出 */
  sections: z.array(z.enum(['trend', 'statusMix', 'topApis', 'logs', 'health'])).max(5).optional(),
});

export const apiListQuerySchema = pagedQuerySchema.extend({
  category: apiCategorySchema.optional(),
  method: httpMethodSchema.optional(),
  status: z.enum(['online', 'degraded', 'offline']).optional(),
  sort: z.enum(['calls', 'latency', 'errorRate', 'updated']).default('calls'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
export type ApiListQuery = z.infer<typeof apiListQuerySchema>;

export const createApiSchema = z
  .object({
    path: z
      .string()
      .trim()
      .regex(/^\/(?:api\/)?v\d+\/[\w\-/]+$/, '路径需以 /api/v1/ 或 /v1/ 开头，仅含字母数字、横线与下划线')
      .max(120),
    name: z.string().trim().min(1, '请输入接口名称').max(40),
    method: httpMethodSchema,
    category: apiCategorySchema,
    /** 后台列表的上线/维护开关就写这个字段，缺了它 PATCH 会被 strict() 判成非法入参 */
    status: z.enum(['online', 'degraded', 'offline']).default('online'),
    description: z.string().trim().max(200).default(''),
    authRequired: boolish.default(false),
    rateLimited: boolish.default(true),
    /** 只校验 URL 格式，不探可达性 */
    upstream: z.string().trim().url().optional().or(z.literal('')),
    cacheSec: z.coerce.number().int().min(0).max(86_400).default(0),
  })
  .strict();
export type CreateApiInput = z.infer<typeof createApiSchema>;

/** 全部字段可选，但至少要改一项 */
export const updateApiSchema = createApiSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: '没有需要更新的字段' });

export const ruleListQuerySchema = pagedQuerySchema.extend({
  enabled: boolish.optional(),
  action: z.enum(['429', 'reject', 'captcha', 'log']).optional(),
  /** 排序交给服务端，前端只排当前页会让人误以为在按全量排 */
  sort: z.enum(['hitsToday', 'limit', 'updatedAt']).default('hitsToday'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

/** create 复用、update 取它的 partial */
const ruleBaseSchema = z
  .object({
    name: z.string().trim().min(2, '规则名称至少 2 个字').max(40),
    scope: z.string().trim().min(1, '请选择规则作用域').max(60).default('global'),
    limit: z.coerce.number().int().min(1, '阈值至少 1 次').max(100_000),
    periodSec: z.coerce.number().int().min(1).max(86_400).default(60),
    action: z.enum(['429', 'reject', 'captcha', 'log']).default('429'),
    enabled: boolish.default(true),
  })
  .strict();

export type RuleListQuery = z.infer<typeof ruleListQuerySchema>;

export const createRuleSchema = ruleBaseSchema.superRefine(
  // limit / periodSec 折算出的速率过高端视为配置无效
  (data, ctx) => {
    const rate = data.limit / data.periodSec;
    if (rate > 1000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['limit'],
        message: `当前速率约 ${Math.round(rate)} 次/秒，过于宽松，请降低阈值或缩短窗口`,
      });
    }
  },
);
export type CreateRuleInput = z.infer<typeof createRuleSchema>;

/** ZodEffects 没有 .partial()，只能从 ruleBaseSchema 派生 */
export const updateRuleSchema = ruleBaseSchema.partial();

export const logListQuerySchema = paginationSchema.extend({
  keyword: keywordSchema,
  path: z.string().trim().max(120).optional(),
  method: httpMethodSchema.optional(),
  status: z.coerce.number().int().min(100).max(599).optional(),
  statusFamily: z.enum(['2xx', '4xx', '5xx']).optional(),
  ip: ipOrCidrSchema.optional(),
  cacheMissOnly: boolish.default(false),
  from: datetimeSchema.optional(),
  to: datetimeSchema.optional(),
  sort: z.enum(['time', 'latency', 'status']).default('time'),
  order: z.enum(['asc', 'desc']).default('desc'),
}).refine(
  (data) => {
    if (!data.from || !data.to) return true;
    return new Date(data.from.replace(' ', 'T')) <= new Date(data.to.replace(' ', 'T'));
  },
  { message: '开始时间不能晚于结束时间', path: ['to'] },
);
export type LogListQuery = z.infer<typeof logListQuerySchema>;

/** 与 SecuritySettings 同步：只接受真正参与请求链路判定的两项，IP 名单与 CORS 走各自的端点 */
export const securityPatchSchema = z
  .object({
    maxBodySizeKb: z.coerce.number().int().min(16).max(16_384).optional(),
    globalRateLimit: z
      .object({
        limit: z.coerce.number().int().min(1).max(100_000),
        periodSec: z.coerce.number().int().min(1).max(86_400),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: '没有需要保存的字段' });

export const ipListSchema = z.object({
  list: z.array(ipOrCidrSchema).min(1, '请至少填写一个 IP 或网段').max(200, '单次最多提交 200 条'),
});
export const ipRemoveSchema = z.object({ ip: ipOrCidrSchema });

export const corsSchema = z.object({
  origins: z.array(corsOriginSchema).max(50).default([]),
});

/** 上下界取自 constants/card-layout，控件与校验同源 */
const cardSpanSchema = z
  .object({
    id: idSchema,
    cols: z.coerce.number().int().min(CARD_COLS_RANGE.min).max(CARD_COLS_RANGE.max),
    rows: z.coerce.number().int().min(CARD_ROWS_RANGE.min).max(CARD_ROWS_RANGE.max),
  })
  .strict();

/** 一处布局 = 按 id 匹配的跨度清单 */
const cardLayoutSchema = z.array(cardSpanSchema).min(1).max(24);

export const siteSettingsPatchSchema = z
  .object({
    siteName: z.string().trim().min(1, '请输入站点名称').max(40).optional(),
    siteDescription: z.string().trim().max(120).optional(),
    contactEmail: z.string().trim().email('联系邮箱格式不正确').optional().or(z.literal('')),
    icp: z.string().trim().max(40).optional().or(z.literal('')),
    maintenanceMode: boolish.optional(),
    maintenanceMessage: z.string().trim().max(200).optional(),
    enableComments: boolish.optional(),
    timezone: z.string().trim().min(1).max(60).optional(),
    dateFormat: z.enum(['iso', 'cn', 'us']).optional(),
    itemsPerPage: z.coerce.number().int().min(6).max(100).optional(),
    autoRefreshSec: z.coerce.number().int().min(0).max(300).optional(),
    liveCardLayout: cardLayoutSchema.optional(),
    plazaCardLayout: cardLayoutSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: '没有需要保存的字段' })
  /** 开启维护模式时必须给提示语 */
  .superRefine((data, ctx) => {
    if (data.maintenanceMode === true && !data.maintenanceMessage?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maintenanceMessage'],
        message: '开启维护模式时需要填写对外的提示信息',
      });
    }
  })
  /** 同一张卡片不能出现两次，否则前台会渲染重复占位 */
  .superRefine((data, ctx) => {
    for (const field of ['liveCardLayout', 'plazaCardLayout'] as const) {
      const layout = data[field];
      if (!layout) continue;
      const seen = new Set<string>();
      layout.forEach((span, index) => {
        if (seen.has(span.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field, index, 'id'],
            message: `卡片 ${span.id} 重复配置`,
          });
        }
        seen.add(span.id);
      });
    }
  });
export type SiteSettingsPatchInput = z.infer<typeof siteSettingsPatchSchema>;

export const notificationQuerySchema = paginationSchema.extend({
  unreadOnly: boolish.default(false),
});

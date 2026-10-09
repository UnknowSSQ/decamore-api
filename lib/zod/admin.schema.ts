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
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

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
    /** 白名单调用方的 key ID 列表 */
    exemptKeys: z.array(idSchema).max(50).default([]),
  })
  .strict();

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

export const securityPatchSchema = z
  .object({
    twoFactorEnabled: boolish.optional(),
    loginNotify: boolish.optional(),
    sessionTimeoutMin: z.coerce.number().int().min(5).max(1440).optional(),
    passwordPolicy: z
      .object({
        minLength: z.coerce.number().int().min(8).max(64),
        requireUpper: boolish,
        requireDigit: boolish,
        requireSymbol: boolish,
      })
      .strict()
      .optional(),
    blockFailedAttempts: boolish.optional(),
    failedAttemptWindowMin: z.coerce.number().int().min(1).max(1440).optional(),
    failedAttemptMax: z.coerce.number().int().min(3).max(100).optional(),
    wafEnabled: boolish.optional(),
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
export type SecurityPatchInput = z.infer<typeof securityPatchSchema>;

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

export const plazaQuerySchema = z.object({
  keyword: keywordSchema,
  category: apiCategorySchema.optional(),
  method: httpMethodSchema.optional(),
});

export const wallpaperTypeSchema = z.enum(['pc', 'mobile', 'bing'], {
  errorMap: () => ({ message: 'type 只能是 pc、mobile 或 bing' }),
});

export const wallpaperQuerySchema = z.object({
  /** ?type= 空值等价于不传，服务端三类等概率随机 */
  type: z.preprocess((value) => (value === '' ? undefined : value), wallpaperTypeSchema.optional()),
});
export type WallpaperQueryInput = z.infer<typeof wallpaperQuerySchema>;

export const hotsearchPlatformSchema = z.enum(['weibo', 'douyin', 'baidu', 'zhihu'], {
  errorMap: () => ({ message: 'platform 只能是 weibo、douyin、baidu 或 zhihu' }),
});

export const hotsearchQuerySchema = z.object({
  /** ?platform= 空值等价于不传，服务端按微博返回 */
  platform: z.preprocess((value) => (value === '' ? undefined : value), hotsearchPlatformSchema.optional()),
});
export type HotSearchQueryInput = z.infer<typeof hotsearchQuerySchema>;

export const hotmusicPlatformSchema = z.enum(['qq', 'netease', 'kugou'], {
  errorMap: () => ({ message: 'platform 只能是 qq、netease 或 kugou' }),
});

export const hotmusicQuerySchema = z.object({
  /** ?platform= 空值等价于不传，服务端按 QQ 音乐返回 */
  platform: z.preprocess((value) => (value === '' ? undefined : value), hotmusicPlatformSchema.optional()),
});
export type HotMusicQueryInput = z.infer<typeof hotmusicQuerySchema>;

export const hotplayTypeSchema = z.enum(['tv', 'movie', 'variety'], {
  errorMap: () => ({ message: 'type 只能是 tv、movie 或 variety' }),
});

export const hotplayQuerySchema = z.object({
  /** ?type= 空值等价于不传，服务端返回电视剧榜 */
  type: z.preprocess((value) => (value === '' ? undefined : value), hotplayTypeSchema.optional()),
});
export type HotPlayQueryInput = z.infer<typeof hotplayQuerySchema>;

export const emojiTypeSchema = z.enum(['menhera'], {
  errorMap: () => ({ message: 'type 只能是 menhera（表情包目前只有这一类）' }),
});

export const avatarTypeSchema = z.enum(['boy', 'girl', 'anime'], {
  errorMap: () => ({ message: 'type 只能是 boy、girl 或 anime' }),
});

export const imageTypeSchema = z.enum(['beauty', 'pretty'], {
  errorMap: () => ({ message: 'type 只能是 beauty 或 pretty' }),
});

/** 空值与不传等价，各自落到下面的默认 type */
export const emojiQuerySchema = z.object({
  type: z.preprocess((value) => (value === '' ? undefined : value), emojiTypeSchema.optional().default('menhera')),
});

export const avatarQuerySchema = z.object({
  type: z.preprocess((value) => (value === '' ? undefined : value), avatarTypeSchema.optional().default('boy')),
});

export const imageQuerySchema = z.object({
  type: z.preprocess((value) => (value === '' ? undefined : value), imageTypeSchema.optional().default('beauty')),
});

/**
 * GET /api/v1/gold — 上海黄金交易所行情（公开）
 * `contract` 缺省 Au99.99。开盘 / 最高 / 最低是从当日分时序列算出来的，上游不单独给。
 */
import { API } from '@/lib/api/endpoints';
import { defineRoute, preflight, publicOk } from '@/lib/server';
import { GOLD_TTL_MS, getGoldQuote } from '@/lib/server/gold';
import { goldQuerySchema } from '@/lib/zod/public.schema';

export const GET = defineRoute(
  {
    auth: false,
    envelope: 'public',
    query: goldQuerySchema,
    route: API.publicApi.gold,
  },
  async (_req, { query }) => publicOk(await getGoldQuote(query?.contract ?? 'Au99.99'), { cacheSeconds: GOLD_TTL_MS / 1000 }),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

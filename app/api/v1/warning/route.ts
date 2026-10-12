/**
 * GET /api/v1/warning — 中央气象台预警信号（公开）
 * 三个筛选参数都可省；上游只认中文筛选值，本站在码表里翻，取回全量后在本地筛。
 */
import { API } from '@/lib/api/endpoints';
import { defineRoute, preflight, publicOk } from '@/lib/server';
import { WARNING_TTL_MS, getWeatherWarnings } from '@/lib/server/warning';
import { warningQuerySchema } from '@/lib/zod/public.schema';

export const GET = defineRoute(
  {
    auth: false,
    envelope: 'public',
    query: warningQuerySchema,
    route: API.publicApi.warning,
  },
  async (_req, { query }) =>
    publicOk(
      await getWeatherWarnings(
        { type: query?.type, level: query?.level, region: query?.region },
        query?.limit,
      ),
      { cacheSeconds: WARNING_TTL_MS / 1000 },
    ),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

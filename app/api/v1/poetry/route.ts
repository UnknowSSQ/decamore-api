/**
 * GET /api/v1/poetry — 古诗词（公开）
 * 无鉴权。语料 public/assets/json/poems.json 的 300 首里随机取一首，可按朝代筛。
 */
import { API } from '@/lib/api/endpoints';
import { defineRoute, preflight, publicOk } from '@/lib/server';
import { randomPoem } from '@/lib/server/poetry';
import { poetryQuerySchema } from '@/lib/zod/public.schema';

export const GET = defineRoute(
  {
    auth: false,
    envelope: 'public',
    query: poetryQuerySchema,
    route: API.publicApi.poetry,
  },
  async (_req, { query }) => publicOk(await randomPoem(query?.dynasty)),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

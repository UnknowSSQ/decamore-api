/**
 * GET /api/v1/idioms — 成语大全（公开）
 * 无鉴权。语料 public/assets/json/ChengYu.json 五万余条，随机取 N 条，可按字数筛。
 */
import { API } from '@/lib/api/endpoints';
import { defineRoute, preflight, publicOk } from '@/lib/server';
import { randomIdioms } from '@/lib/server/idioms';
import { IDIOMS_DEFAULT_LIMIT, idiomsQuerySchema } from '@/lib/zod/public.schema';

export const GET = defineRoute(
  {
    auth: false,
    envelope: 'public',
    query: idiomsQuerySchema,
    route: API.publicApi.idioms,
  },
  async (_req, { query }) =>
    publicOk(await randomIdioms(query?.limit ?? IDIOMS_DEFAULT_LIMIT, query?.chars)),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

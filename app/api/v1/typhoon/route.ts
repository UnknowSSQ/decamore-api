/**
 * GET /api/v1/typhoon — 台风编号列表与路径（公开）
 * 不传 `id` 给全部编号（含在架与已停编），传 `id` 给该台风每 3 小时一个时次的路径点。
 */
import { API } from '@/lib/api/endpoints';
import { defineRoute, preflight, publicOk } from '@/lib/server';
import { getTyphoonList, getTyphoonTrack, TYPHOON_TTL_MS } from '@/lib/server/typhoon';
import { typhoonQuerySchema } from '@/lib/zod/public.schema';

export const GET = defineRoute(
  {
    auth: false,
    envelope: 'public',
    query: typhoonQuerySchema,
    route: API.publicApi.typhoon,
  },
  async (_req, { query }) => {
    const data = query?.id ? await getTyphoonTrack(query.id) : await getTyphoonList();
    return publicOk(data, { cacheSeconds: TYPHOON_TTL_MS / 1000 });
  },
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

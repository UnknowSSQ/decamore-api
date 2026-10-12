/**
 * GET /api/v1/netease — 网易云热评（公开）
 * 无鉴权。可选 `id` 指定歌单；不传则在内置歌单池（constants/netease-playlists.ts）里随机挑一个，
 * 再从歌单随机抽一首歌，返回这首歌热评里随机的一条。
 */
import { API } from '@/lib/api/endpoints';
import { defineRoute, preflight, publicOk } from '@/lib/server';
import { randomNeteaseComment } from '@/lib/server/netease';
import { neteaseQuerySchema } from '@/lib/zod/public.schema';

export const GET = defineRoute(
  {
    auth: false,
    envelope: 'public',
    query: neteaseQuerySchema,
    route: API.publicApi.netease,
  },
  async (_req, { query }) => publicOk(await randomNeteaseComment(query?.id)),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

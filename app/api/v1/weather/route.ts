/**
 * GET /api/v1/weather — 城市实况天气（公开）
 * `city` 是内置城市表的拼音键（39 个：省会、直辖市与深圳厦门宁波青岛大连），不传按北京。
 */
import { API } from '@/lib/api/endpoints';
import { defineRoute, preflight, publicOk } from '@/lib/server';
import { WEATHER_TTL_MS, getWeatherNow } from '@/lib/server/weather';
import { weatherQuerySchema } from '@/lib/zod/public.schema';

export const GET = defineRoute(
  {
    auth: false,
    envelope: 'public',
    query: weatherQuerySchema,
    route: API.publicApi.weather,
  },
  async (_req, { query }) => publicOk(await getWeatherNow(query?.city ?? 'beijing'), { cacheSeconds: WEATHER_TTL_MS / 1000 }),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

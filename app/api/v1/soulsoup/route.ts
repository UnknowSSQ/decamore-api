/**
 * GET /api/v1/soulsoup — 毒鸡汤（公开）
 * 无鉴权、无参数。语料 public/assets/json/soul.json 的 2,020 条里随机一条。
 */
import { API } from '@/lib/api/endpoints';
import { defineRoute, preflight, publicOk } from '@/lib/server';
import { randomSoulLine } from '@/lib/server/soulsoup';

export const GET = defineRoute(
  {
    auth: false,
    envelope: 'public',
    route: API.publicApi.soulsoup,
  },
  async () => publicOk(await randomSoulLine()),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

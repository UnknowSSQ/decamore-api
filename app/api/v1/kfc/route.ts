/**
 * GET /api/v1/kfc — 疯狂星期四文案（公开）
 * 无鉴权、无参数。语料 public/assets/json/kfc.json 的 424 条文案里随机一条，不限星期几。
 */
import { API } from '@/lib/api/endpoints';
import { defineRoute, preflight, publicOk } from '@/lib/server';
import { randomKfcCopy } from '@/lib/server/kfc';

export const GET = defineRoute(
  {
    auth: false,
    envelope: 'public',
    route: API.publicApi.kfc,
  },
  async () => publicOk(await randomKfcCopy()),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

/**
 * GET /api/v1/exchange — 人民币汇率中间价（公开）
 * 无参数，一次给全部币对。数据是中国外汇交易中心每个交易日 9:15 发布的官方中间价。
 */
import { API } from '@/lib/api/endpoints';
import { defineRoute, preflight, publicOk } from '@/lib/server';
import { EXCHANGE_TTL_MS, getExchangeRates } from '@/lib/server/exchange';

export const GET = defineRoute(
  {
    auth: false,
    envelope: 'public',
    route: API.publicApi.exchange,
  },
  async () => publicOk(await getExchangeRates(), { cacheSeconds: EXCHANGE_TTL_MS / 1000 }),
);

/** 跨域预检：来源在后台 CORS 配置里才带 Allow-Origin */
export const OPTIONS = preflight();

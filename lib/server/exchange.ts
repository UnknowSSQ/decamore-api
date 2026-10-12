/**
 * 人民币汇率中间价：中国外汇交易中心（CWAP）每天 9:15 发布的官方牌价，免 cookie 免签名。
 * 这是中间价不是市场价，周末与节假日不更新，所以缓存可以放长。
 */
import 'server-only';

import { asArray, asRecord, getUpstreamJson, num, str } from './upstream';
import { createBoardCache } from './board-cache';
import { type ExchangeRate, type ExchangeRateResult } from '@/types';
import { UpstreamUnavailableError } from './errors';

const FEED_URL = 'https://www.chinamoney.com.cn/r/cms/www/chinamoney/data/fx/ccpr.json';
const REFERER = 'https://www.chinamoney.com.cn/chinese/bkccpr/';
/** 一天只发一次，1 小时已经够保守；非交易日刷新也只是拿到同一份 */
export const EXCHANGE_TTL_MS = 60 * 60_000;

function toRate(row: unknown): ExchangeRate | null {
  const one = asRecord(row);
  if (!one) return null;
  const pair = str(one.vrtEName);
  const price = num(one.price);
  if (!pair || price === null) return null;
  return {
    name: str(one.vrtName),
    pair,
    currency: str(one.foreignCName),
    price,
    // bp 那一列是无符号绝对值，带方向的是 bpDouble
    change: num(one.bpDouble),
  };
}

async function fetchRates(): Promise<ExchangeRateResult> {
  const json = await getUpstreamJson(FEED_URL, REFERER);
  const rates = asArray(json.records).map(toRate).filter((one): one is ExchangeRate => one !== null);
  if (rates.length === 0) throw new Error('上游 records 里没有可用币对');
  const lastDate = str(asRecord(json.data)?.lastDate);
  // 「2026-10-09 9:15」取日期段；形态变了宁可给今天，也不猜一个别的日期
  const date = /^\d{4}-\d{2}-\d{2}/.test(lastDate) ? lastDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
  return { date, rates, cached: false };
}

const resolveRates = createBoardCache<'today', ExchangeRateResult, ExchangeRateResult>({
  slot: '__decamoreExchange',
  ttlMs: EXCHANGE_TTL_MS,
  fetch: async () => {
    try {
      return await fetchRates();
    } catch (error) {
      throw new UpstreamUnavailableError('汇率中间价', error instanceof Error ? error.message : String(error));
    }
  },
});

export function getExchangeRates(): Promise<ExchangeRateResult> {
  return resolveRates('today');
}

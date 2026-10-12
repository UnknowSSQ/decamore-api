/**
 * 金价：上海黄金交易所官网的分时行情接口，免 cookie 免签名。
 * 上游只给两条等长数组（times 与 data），没有单独的开盘 / 最高 / 最低字段，
 * 所以这三个值是从分时序列里算出来的——首点即当日开盘，末点即最新价。
 */
import 'server-only';

import { GOLD_CONTRACTS, type GoldContractCode } from '@/constants/gold-contracts';
import { asArray, getUpstreamJson, num, str } from './upstream';
import { createBoardCache } from './board-cache';
import { type GoldQuote } from '@/types';
import { UpstreamUnavailableError } from './errors';

const REFERER = 'https://www.sge.com.cn/sjzx/mrhqsj';
/** 交易时段价格一直在动，60 秒与榜单类同档 */
export const GOLD_TTL_MS = 60_000;

const UNIT_BY_CODE = new Map<string, string>(GOLD_CONTRACTS.map((one) => [one.code, one.unit]));

/** 「2026年10月12日 02:29:53」是北京时间，转 ISO 要减掉 8 小时 */
function parseBeijingTime(raw: string): string | null {
  const matched = /^(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2}):(\d{2})$/.exec(raw.trim());
  if (!matched) return null;
  const [, y, mo, d, h, mi, s] = matched;
  const ms = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h) - 8, Number(mi), Number(s));
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

async function fetchQuote(contract: string): Promise<GoldQuote> {
  const json = await getUpstreamJson(
    `https://www.sge.com.cn/graph/quotations?instid=${encodeURIComponent(contract)}`,
    REFERER,
  );
  if (str(json.heyue) !== contract) throw new Error(`上游把合约换成了 ${str(json.heyue) || '(空)'}`);

  const series = asArray(json.data)
    .map((one) => num(one))
    .filter((one): one is number => one !== null);
  if (series.length === 0) throw new Error('分时序列是空的');

  return {
    contract,
    unit: UNIT_BY_CODE.get(contract) ?? '元/克',
    price: series[series.length - 1]!,
    open: series[0]!,
    high: Math.max(...series),
    low: Math.min(...series),
    points: series.length,
    asOf: str(json.now),
    updatedAt: parseBeijingTime(str(json.delaystr)),
    cached: false,
  };
}

const resolveQuote = createBoardCache<string, GoldQuote, GoldQuote>({
  slot: '__decamoreGoldQuote',
  ttlMs: GOLD_TTL_MS,
  fetch: async (contract) => {
    try {
      return await fetchQuote(contract);
    } catch (error) {
      throw new UpstreamUnavailableError('金价', error instanceof Error ? error.message : String(error));
    }
  },
});

export function getGoldQuote(contract: GoldContractCode): Promise<GoldQuote> {
  return resolveQuote(contract);
}

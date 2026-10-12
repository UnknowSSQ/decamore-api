/**
 * 行情：腾讯 qt.gtimg.cn，免 key、一次可取多个标的（实测 63ms 拿 6 个，个股 / 指数 / ETF / 北交所 / 港股 / 美股都通）。
 * 响应体是 GBK 的 `v_<代码>="字段~字段…";` 拼接，基础位序三族一致、扩展位序不一致，所以取值分表；
 * 量纲在这里统一成「股 / 元」（A 股族上游给手与万元），时刻按交易所时区换 ISO。
 * 刻意不进 board-cache：价格缓存 60 秒就是把旧价当新价给，而 codes 的组合又会把缓存键空间撑爆。
 */
import 'server-only';

import { FAMILY_BY_MARKET, parseStockCode, STOCK_MARKET_BY_KEY, type StockMarketSpec } from '@/constants/stock-markets';
import { NotFoundError, UpstreamUnavailableError } from './errors';
import { parseWallClock } from './time';
import { getUpstreamBytes } from './upstream';
import type { StockBoard, StockQuote } from '@/types';

const REFERER = 'https://gu.qq.com/';

/** 三族一致的基础位序，2026-10-11 用茅台 / 上证指数 / 腾讯控股 / 道琼斯 / 苹果逐字段对过数 */
const FIELD = {
  name: 1,
  symbol: 2,
  price: 3,
  prevClose: 4,
  open: 5,
  quoteTime: 30,
  change: 31,
  changePercent: 32,
  high: 33,
  low: 34,
  volume: 36,
  amount: 37,
  turnover: 38,
  pe: 39,
  amplitude: 43,
  floatMarketCap: 44,
  totalMarketCap: 45,
} as const;

/** 三族不一致的扩展位序：美股的品种标记在 56、币种在 35，港股在 63 与 75，A 股在 61 与 82 */
const EXTRA = {
  cn: { kind: 61, currency: 82, week52High: 67, week52Low: 68, limitUp: 47, limitDown: 48 },
  hk: { kind: 63, currency: 75, week52High: 48, week52Low: 49 },
  us: { kind: 56, currency: 35, week52High: 48, week52Low: 49 },
} as const;

/** 空串与 '-' 都算没有值；上游在这里放的就是空段 */
function decimal(raw: string | undefined): number | null {
  const text = (raw ?? '').trim();
  if (text === '') return null;
  const value = Number(text.replace(/,/g, ''));
  return Number.isFinite(value) ? value : null;
}

/** 上游对指数把涨跌停写成 -1，负数在这里没有行情含义 */
function positive(raw: string | undefined): number | null {
  const value = decimal(raw);
  return value !== null && value > 0 ? value : null;
}

function text(raw: string | undefined): string {
  return (raw ?? '').trim();
}

function parseRow(body: string, code: string, spec: StockMarketSpec): StockQuote | null {
  const f = body.split('~');
  const extra = EXTRA[FAMILY_BY_MARKET[spec.key]];
  const price = decimal(f[FIELD.price]);
  if (price === null) return null;

  return {
    code,
    market: spec.key,
    name: text(f[FIELD.name]),
    symbol: text(f[FIELD.symbol]),
    price,
    prevClose: decimal(f[FIELD.prevClose]) ?? 0,
    open: decimal(f[FIELD.open]) ?? 0,
    high: decimal(f[FIELD.high]) ?? 0,
    low: decimal(f[FIELD.low]) ?? 0,
    change: decimal(f[FIELD.change]) ?? 0,
    changePercent: decimal(f[FIELD.changePercent]) ?? 0,
    volume: (decimal(f[FIELD.volume]) ?? 0) * spec.volumeScale,
    amount: (decimal(f[FIELD.amount]) ?? 0) * spec.amountScale,
    turnoverRate: decimal(f[FIELD.turnover]),
    peRatio: decimal(f[FIELD.pe]),
    amplitude: decimal(f[FIELD.amplitude]),
    floatMarketCap: decimal(f[FIELD.floatMarketCap]),
    totalMarketCap: decimal(f[FIELD.totalMarketCap]),
    week52High: decimal(f[extra.week52High]),
    week52Low: decimal(f[extra.week52Low]),
    limitUp: 'limitUp' in extra ? positive(f[extra.limitUp]) : null,
    limitDown: 'limitDown' in extra ? positive(f[extra.limitDown]) : null,
    currency: text(f[extra.currency]),
    kind: text(f[extra.kind]),
    quoteTime: text(f[FIELD.quoteTime]),
    quotedAt: parseWallClock(text(f[FIELD.quoteTime]), spec.timeZone),
  };
}

/** codes 已由 quoteQuerySchema 规范化（补前缀、去重、统一大写），这里只负责取数与解码 */
export async function getStockQuotes(codes: readonly string[]): Promise<StockBoard> {
  let bytes: Uint8Array;
  try {
    bytes = await getUpstreamBytes(`https://qt.gtimg.cn/q=${codes.map(encodeURIComponent).join(',')}`, REFERER);
  } catch (error) {
    throw new UpstreamUnavailableError('行情', error instanceof Error ? error.message : String(error));
  }

  // 查不到的代码不会出现在返回里，上游只补一行 v_pv_none_match="1"，按 key 取自然落空
  const rows = new Map<string, string>();
  for (const matched of new TextDecoder('gbk').decode(bytes).matchAll(/v_([^=]+)="([\s\S]*?)"/g)) {
    rows.set(matched[1]!, matched[2]!);
  }

  const items = codes.flatMap((code) => {
    const parsed = parseStockCode(code);
    const spec = parsed ? STOCK_MARKET_BY_KEY.get(parsed.spec.key) : undefined;
    const body = rows.get(code);
    if (!spec || body === undefined) return [];
    const quote = parseRow(body, code, spec);
    return quote ? [quote] : [];
  });
  if (items.length === 0) throw new NotFoundError(`这几个代码查无行情：${codes.join('、')}`);

  return { updatedAt: new Date().toISOString(), requested: codes.length, count: items.length, items };
}

/**
 * 行情代码的前缀表。上游按「前缀 + 代码」寻址，五种前缀共用同一套基础字段位序，
 * 但品种标记、币种、52 周高低的下标各不相同（A 股族 88 段、港股 78 段、美股 73 段），
 * 所以量纲统一与时区换算都以这张表为准，接口文档里的市场表也从这里派生。
 */
import type { StockMarket } from '@/types';

/** 上游单次约 50 条封顶（实测传 120 个只回 50 条），这里给到 20：够一屏自选股，也留得住响应体 */
export const STOCK_MAX_CODES = 20;

export interface StockMarketSpec {
  key: StockMarket;
  /** 中文名，文档与错误文案共用 */
  label: string;
  /** 「前缀之后那一段」的形状 */
  shape: RegExp;
  /** 实测可用的示例代码 */
  sample: string;
  /** 交易所时区，墙上时间换 ISO 用 */
  timeZone: string;
  /** 乘到这个数才是「股」：A 股族上游给的是手 */
  volumeScale: number;
  /** 乘到这个数才是「元」：A 股族上游给的是万元 */
  amountScale: number;
}

export const STOCK_MARKETS = [
  { key: 'sh', label: '上交所', shape: /^\d{6}$/, sample: 'sh600519', timeZone: 'Asia/Shanghai', volumeScale: 100, amountScale: 10_000 },
  { key: 'sz', label: '深交所', shape: /^\d{6}$/, sample: 'sz399006', timeZone: 'Asia/Shanghai', volumeScale: 100, amountScale: 10_000 },
  { key: 'bj', label: '北交所', shape: /^\d{6}$/, sample: 'bj430047', timeZone: 'Asia/Shanghai', volumeScale: 100, amountScale: 10_000 },
  { key: 'hk', label: '港交所', shape: /^(\d{5}|[A-Z]{2,6})$/, sample: 'hk00700', timeZone: 'Asia/Hong_Kong', volumeScale: 1, amountScale: 1 },
  { key: 'us', label: '美股', shape: /^[A-Z][A-Z0-9.]{0,9}$/, sample: 'usAAPL', timeZone: 'America/New_York', volumeScale: 1, amountScale: 1 },
] as const satisfies readonly StockMarketSpec[];

export type StockMarketFamily = 'cn' | 'hk' | 'us';

/** 决定「按哪套扩展位序取值」：沪深北同族，港股与美股各自成一族 */
export const FAMILY_BY_MARKET: Record<StockMarket, StockMarketFamily> = {
  sh: 'cn',
  sz: 'cn',
  bj: 'cn',
  hk: 'hk',
  us: 'us',
};

export const STOCK_MARKET_BY_KEY = new Map<StockMarket, StockMarketSpec>(
  STOCK_MARKETS.map((one) => [one.key, one as StockMarketSpec]),
);

/** 前缀 + 代码拆成 { 市场, 代码 }；形状不符返回 null。前缀大小写都收（HK00700 与 hk00700 同义），代码统一大写 */
export function parseStockCode(value: string): { spec: StockMarketSpec; symbol: string } | null {
  const matched = /^(sh|sz|bj|hk|us)(.+)$/i.exec(value.trim());
  if (!matched) return null;
  const spec = STOCK_MARKET_BY_KEY.get(matched[1]!.toLowerCase() as StockMarket);
  if (!spec) return null;
  const symbol = matched[2]!.toUpperCase();
  return spec.shape.test(symbol) ? { spec, symbol } : null;
}

/** 参数里的逗号串 → 规范化代码数组：去空白、补市场前缀、去重，校验与取数共用这一步 */
export function normalizeStockCodes(values: readonly string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const parsed = parseStockCode(value);
    if (!parsed) continue;
    const code = `${parsed.spec.key}${parsed.symbol}`;
    if (!out.includes(code)) out.push(code);
  }
  return out;
}

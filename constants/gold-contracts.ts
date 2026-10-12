/**
 * 上海黄金交易所的行情合约。代码就是上游 instid 的取值，六个都实测过返回 200。
 * unit 按交易所的报价惯例：黄金系列是元 / 克，Ag99.99 是元 / 千克
 * （实测同一时刻 Au99.99 末价 898.0、Ag99.99 末价 14708.0，差着 16 倍量级）。
 */
export const GOLD_CONTRACTS = [
  { code: 'Au99.99', unit: '元/克' },
  { code: 'Au99.95', unit: '元/克' },
  { code: 'Au100g', unit: '元/克' },
  { code: 'iAu99.99', unit: '元/克' },
  { code: 'Au(T+D)', unit: '元/克' },
  { code: 'Ag99.99', unit: '元/千克' },
] as const;

export type GoldContractCode = (typeof GOLD_CONTRACTS)[number]['code'];

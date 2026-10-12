'use client';
/**
 * 五个数据类 demo 同源同形状（一行一个「标签 + 数值」），放一个文件里共用一个 chunk。
 * 点卡片换的是「看哪几行 / 看哪个对象」，不是重新问上游——上游那侧有 60 秒到 1 小时的缓存。
 */
import { GOLD_CONTRACTS } from '@/constants/gold-contracts';
import { STOCK_MARKETS } from '@/constants/stock-markets';
import { WEATHER_CITIES } from '@/constants/weather-cities';
import { WARNING_LEVELS } from '@/constants/warning-signals';
import { fetchExchangeRates, fetchGoldQuote, fetchStockQuotes, fetchWeatherNow, fetchWeatherWarnings } from '@/lib/api';
import type { DemoProps } from './types';
import { DEMO_ROWS, clock, useDemoFetch } from './types';

/** 变动点折成两位小数：中间价的 1 点是 0.0001，直接写整数会看着像 37 元 */
function pointsText(change: number | null): string {
  if (change === null) return '';
  const yuan = change / 10_000;
  return `${yuan > 0 ? '+' : ''}${yuan.toFixed(4)}`;
}

export function ExchangeDemo({ seed }: DemoProps) {
  const { data: board, failed } = useDemoFetch(seed, () => fetchExchangeRates());
  const rows = board ? board.rates.slice((seed * DEMO_ROWS) % board.rates.length).concat(board.rates).slice(0, DEMO_ROWS) : [];

  return (
    <div className="plaza-demo-ranklist">
      <div className="plaza-demo-ranklist-head">
        {board
          ? `人民币中间价 · ${board.date} 发布 · ${board.rates.length} 个币对${board.cached ? '（缓存）' : ''}`
          : failed
            ? '汇率中间价取不到'
            : '正在取汇率中间价…'}
      </div>
      {rows.map((rate, index) => (
        <div key={rate.pair} className="plaza-demo-ranklist-row">
          <span className={`plaza-demo-ranklist-rank${index === 0 ? ' plaza-demo-ranklist-rank-top' : ''}`}>
            {rate.pair.split('/')[0]}
          </span>
          <span className="plaza-demo-ranklist-text">{rate.name}</span>
          <span className="plaza-demo-ranklist-meta">
            {rate.price.toFixed(4)}
            {pointsText(rate.change) ? ` ${pointsText(rate.change)}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

export function GoldDemo({ seed }: DemoProps) {
  const contract = GOLD_CONTRACTS[seed % GOLD_CONTRACTS.length]!;
  const { data: quote, failed } = useDemoFetch(seed, () => fetchGoldQuote(contract.code));

  return (
    <div className="plaza-demo-ranklist">
      <div className="plaza-demo-ranklist-head">
        {quote
          ? `${contract.code} · ${quote.price.toFixed(2)} ${contract.unit}${quote.cached ? '（缓存）' : ''}`
          : failed
            ? '金价取不到（上游 503）'
            : '正在取金价…'}
      </div>
      {quote && (
        <>
          <div className="plaza-demo-ranklist-row">
            <span className="plaza-demo-ranklist-rank plaza-demo-ranklist-rank-top">今开</span>
            <span className="plaza-demo-ranklist-text">{quote.open.toFixed(2)} {contract.unit}</span>
            <span className="plaza-demo-ranklist-meta">{quote.asOf}</span>
          </div>
          <div className="plaza-demo-ranklist-row">
            <span className="plaza-demo-ranklist-rank">最高</span>
            <span className="plaza-demo-ranklist-text">{quote.high.toFixed(2)}</span>
            <span className="plaza-demo-ranklist-meta">{quote.points} 个分时点</span>
          </div>
          <div className="plaza-demo-ranklist-row">
            <span className="plaza-demo-ranklist-rank">最低</span>
            <span className="plaza-demo-ranklist-text">{quote.low.toFixed(2)}</span>
            <span className="plaza-demo-ranklist-meta">六个合约可换</span>
          </div>
        </>
      )}
    </div>
  );
}

export function WeatherDemo({ seed }: DemoProps) {
  const city = WEATHER_CITIES[seed % WEATHER_CITIES.length]!;
  const { data: now, failed } = useDemoFetch(seed, () => fetchWeatherNow(city.key));

  return (
    <div className="plaza-demo-ranklist">
      <div className="plaza-demo-ranklist-head">
        {now
          ? `${now.city} · ${now.weather} ${now.temp ?? '—'}℃${now.cached ? '（缓存）' : ''}`
          : failed
            ? '实况天气取不到'
            : `正在取${city.name}实况…`}
      </div>
      {now && (
        <>
          <div className="plaza-demo-ranklist-row">
            <span className="plaza-demo-ranklist-rank plaza-demo-ranklist-rank-top">风</span>
            <span className="plaza-demo-ranklist-text">
              {now.windDir} {now.windPower}（{now.windSpeed}）
            </span>
            <span className="plaza-demo-ranklist-meta">{now.time}</span>
          </div>
          <div className="plaza-demo-ranklist-row">
            <span className="plaza-demo-ranklist-rank">湿</span>
            <span className="plaza-demo-ranklist-text">
              相对湿度 {now.humidity} · 气压 {now.pressure ?? '—'} hPa
            </span>
            <span className="plaza-demo-ranklist-meta">能见 {now.visibility}</span>
          </div>
          <div className="plaza-demo-ranklist-row">
            <span className="plaza-demo-ranklist-rank">气</span>
            <span className="plaza-demo-ranklist-text">AQI {now.aqi ?? '—'}</span>
            <span className="plaza-demo-ranklist-meta">{now.limitNumber}</span>
          </div>
        </>
      )}
    </div>
  );
}

/** 金额与股数折成万 / 亿，卡片里放不下九位数 */
function compact(value: number): string {
  if (Math.abs(value) >= 1e8) return `${(value / 1e8).toFixed(2)} 亿`;
  if (Math.abs(value) >= 1e4) return `${Math.round(value / 1e4)} 万`;
  return String(value);
}

/** 一次请求拿五个市场各一只，正是这个接口「codes 可以逗号分隔」的卖点 */
const STOCK_BASKET = STOCK_MARKETS.map((one) => one.sample);

export function StockDemo({ seed }: DemoProps) {
  const { data: board, failed } = useDemoFetch(seed, () => fetchStockQuotes(STOCK_BASKET));

  return (
    <div className="plaza-demo-ranklist">
      <div className="plaza-demo-ranklist-head">
        {board
          ? `一次取 ${board.count} 个代码 · ${clock(board.updatedAt)} 抓${board.requested === board.count ? '' : '（部分代码查无）'}`
          : failed
            ? '行情取不到（上游 503 或代码查无）'
            : '正在取行情…'}
      </div>
      {(board?.items ?? []).map((quote) => (
        <div key={quote.code} className="plaza-demo-ranklist-row">
          <span
            className={`plaza-demo-ranklist-rank${quote.code === STOCK_BASKET[seed % STOCK_BASKET.length] ? ' plaza-demo-ranklist-rank-top' : ''}`}
          >
            {quote.market.toUpperCase()}
          </span>
          <span className="plaza-demo-ranklist-text">
            {quote.name} {quote.symbol}
          </span>
          <span className="plaza-demo-ranklist-meta">
            {quote.price} {quote.change > 0 ? '+' : ''}
            {quote.changePercent}% {compact(quote.amount)}
            {quote.currency}
          </span>
        </div>
      ))}
    </div>
  );
}

const LEVEL_LABEL = new Map(WARNING_LEVELS.map((one) => [one.key, one.value.slice(0, 1)]));

export function WarningDemo({ seed }: DemoProps) {
  const { data: board, failed } = useDemoFetch(seed, () => fetchWeatherWarnings({ limit: DEMO_ROWS }));

  return (
    <div className="plaza-demo-ranklist">
      <div className="plaza-demo-ranklist-head">
        {board
          ? `此刻在架 ${board.upstreamTotal} 条 · 红 ${board.levelCount.red} 橙 ${board.levelCount.orange} 黄 ${board.levelCount.yellow} 蓝 ${board.levelCount.blue}${board.cached ? '（缓存）' : ''}`
          : failed
            ? '预警信号取不到（上游 503）'
            : '正在取预警信号…'}
      </div>
      {(board?.items ?? []).map((one) => (
        <div key={one.alertId} className="plaza-demo-ranklist-row">
          <span className={`plaza-demo-ranklist-rank${one.level === 'red' || one.level === 'orange' ? ' plaza-demo-ranklist-rank-top' : ''}`}>
            {one.level ? LEVEL_LABEL.get(one.level) : '—'}
          </span>
          <span className="plaza-demo-ranklist-text">{one.title}</span>
          <span className="plaza-demo-ranklist-meta">{one.issuedAt ? clock(one.issuedAt) : ''}</span>
        </div>
      ))}
    </div>
  );
}

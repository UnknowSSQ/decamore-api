/** 猫眼实时票房榜抓取；上游 5 秒一刷，对外按业务口径缓存 1 小时 */
import 'server-only';

import { asArray, asRecord, getUpstreamJson, num, str } from './upstream';
import { ERROR_CODE, type HotChartItem, type HotChartResult } from '@/types';
import { ApiError } from './errors';

export const HOT_CHART_CACHE_TTL_MS = 60 * 60_000;

const MOVIE_RANK_URL = 'https://piaofang.maoyan.com/dashboard-ajax/movie';

function unavailable(reason: string): ApiError {
  return new ApiError(503, ERROR_CODE.SERVICE_UNAVAILABLE, '热映榜暂时取不到', { description: reason });
}

/** 「1510.39」+「万」→ 「1510.39万」；两段缺任意一段就返回 null */
function joinUnit(value: unknown): string | null {
  const unit = asRecord(value);
  const numText = unit ? str(unit.num) : '';
  const unitText = unit ? str(unit.unit) : '';
  if (!numText || !unitText) return null;
  return `${numText}${unitText}`;
}

/** 上游 box 单位是分，对外统一成元 */
function centsToYuan(value: unknown): number | null {
  const cents = num(value);
  return cents === null ? null : Math.round(cents / 100);
}

function toItems(payload: Record<string, unknown>): HotChartItem[] {
  const list = asArray(asRecord(payload.movieList)?.list);

  return list.flatMap((raw, index) => {
    const row = asRecord(raw);
    const info = asRecord(row?.movieInfo);
    const title = info ? str(info.movieName) : '';
    if (!row || !title) return [];
    return [{
      rank: index + 1,
      title,
      releaseInfo: str(info?.releaseInfo) || null,
      boxOffice: centsToYuan(row.box),
      boxOfficeText: joinUnit(row.boxSplitUnit),
      boxRate: str(row.boxRate) || null,
      totalBoxOffice: str(row.sumBoxDesc) || null,
      showCount: num(row.showCount),
      seatRate: str(row.avgSeatView) || null,
      viewPerShow: str(row.avgShowView) || null,
    } satisfies HotChartItem];
  });
}

interface CacheEntry {
  at: number;
  updateTimeMs: number;
  items: HotChartItem[];
}

/** 缓存挂 globalThis：Next 按 route 分包，模块级变量每个 chunk 各存一份 */
const globalStore = globalThis as typeof globalThis & { __decamoreHotChart?: CacheEntry | null };
const inflight = { pending: null as Promise<HotChartResult> | null };

function toResult(entry: CacheEntry, cached: boolean): HotChartResult {
  return {
    updateTime: new Date(entry.updateTimeMs).toISOString(),
    cached,
    items: entry.items,
  };
}

async function load(): Promise<HotChartResult> {
  let json: Record<string, unknown>;
  try {
    // 缺 referer 或 x-requested-with 会被判 403
    json = await getUpstreamJson(MOVIE_RANK_URL, 'https://piaofang.maoyan.com/dashboard', {
      'x-requested-with': 'XMLHttpRequest',
    });
  } catch (error) {
    throw unavailable(error instanceof Error ? error.message : String(error));
  }

  const items = toItems(json);
  if (items.length === 0) throw unavailable('上游返回的结构里没有可用影片');

  // 上游偶尔缺 updateInfo，退回抓取时刻
  const timestamp = num(asRecord(asRecord(json.movieList)?.updateInfo)?.updateTimestamp);
  const entry: CacheEntry = { at: Date.now(), updateTimeMs: timestamp ?? Date.now(), items };
  globalStore.__decamoreHotChart = entry;
  return toResult(entry, false);
}

/** 缓存命中直接返回；同一 chunk 内的并发请求合并成一次上游调用 */
export async function getHotChart(): Promise<HotChartResult> {
  const entry = globalStore.__decamoreHotChart;
  if (entry && Date.now() - entry.at < HOT_CHART_CACHE_TTL_MS) return toResult(entry, true);

  if (!inflight.pending) {
    inflight.pending = load().finally(() => {
      inflight.pending = null;
    });
  }
  return inflight.pending;
}

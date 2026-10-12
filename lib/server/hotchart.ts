/** 猫眼实时票房榜抓取；上游 5 秒一刷，对外按业务口径缓存 1 小时 */
import 'server-only';

import { asArray, asRecord, getUpstreamJson, num, str } from './upstream';
import { createBoardCache } from './board-cache';
import { type HotChartItem, type HotChartResult } from '@/types';
import { UpstreamUnavailableError } from './errors';

export const HOT_CHART_CACHE_TTL_MS = 60 * 60_000;

const MOVIE_RANK_URL = 'https://piaofang.maoyan.com/dashboard-ajax/movie';

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

interface Board {
  updateTimeMs: number;
  items: HotChartItem[];
}

function toResult(_key: 'chart', board: Board, cached: boolean): HotChartResult {
  return {
    updateTime: new Date(board.updateTimeMs).toISOString(),
    cached,
    items: board.items,
  };
}

/** 猫眼榜没有分档，只有一个槽位；缓存命中直接返回，并发请求合并成一次上游调用 */
const resolveHotChart = createBoardCache<'chart', Board, HotChartResult>({
  slot: '__decamoreHotChart',
  ttlMs: HOT_CHART_CACHE_TTL_MS,
  fetch: async () => {
    let json: Record<string, unknown>;
    try {
      // 缺 referer 或 x-requested-with 会被判 403
      json = await getUpstreamJson(MOVIE_RANK_URL, 'https://piaofang.maoyan.com/dashboard', {
        'x-requested-with': 'XMLHttpRequest',
      });
    } catch (error) {
      throw new UpstreamUnavailableError('热映榜', error instanceof Error ? error.message : String(error));
    }

    const items = toItems(json);
    if (items.length === 0) throw new UpstreamUnavailableError('热映榜', '上游返回的结构里没有可用影片');

    // 上游偶尔缺 updateInfo，退回抓取时刻
    const timestamp = num(asRecord(asRecord(json.movieList)?.updateInfo)?.updateTimestamp);
    return { updateTimeMs: timestamp ?? Date.now(), items };
  },
  toResult,
});

/** limit 只截 items：缓存与 single-flight 仍按全量共享 */
export async function getHotChart(limit?: number): Promise<HotChartResult> {
  const result = await resolveHotChart('chart');
  return limit ? { ...result, items: result.items.slice(0, limit) } : result;
}

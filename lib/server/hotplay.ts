/** 热播榜（欢网大屏数据）抓取；端点匿名可访问，免 cookie 与签名 */
import 'server-only';

import { asArray, asRecord, getUpstreamJson, num, str } from './upstream';
import { createBoardCache } from './board-cache';
import { ERROR_CODE, type HotPlayItem, type HotPlayType, type HotPlayResult } from '@/types';
import { ApiError } from './errors';

export const HOT_PLAY_CACHE_TTL_MS = 10 * 60_000;
export const DEFAULT_HOT_PLAY_TYPE: HotPlayType = 'tv';

const HOST = 'tv-zone-api.huan.tv';
const REFERER = 'https://bigdata.huan.tv/realtime/live';

/** channel_type 4 及以上实测为空，故对外只有这三类 */
const TYPE_CHANNEL: Record<HotPlayType, number> = { tv: 1, variety: 2, movie: 3 };
const TYPE_LABEL: Record<HotPlayType, string> = { tv: '电视剧', movie: '电影', variety: '综艺' };

function unavailable(type: HotPlayType, reason: string): ApiError {
  return new ApiError(503, ERROR_CODE.SERVICE_UNAVAILABLE, `${TYPE_LABEL[type]}热播榜暂时取不到`, {
    description: reason,
  });
}

/** 用本地日期：上游按东八区出榜，部署与访问都在国内 */
function ymd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface BoardResponse {
  list: unknown[];
  /** 最近有榜日期，当天没榜时用它再取一次 */
  lastTime: string | null;
}

async function fetchBoard(channelType: number, date: string): Promise<BoardResponse> {
  const json = await getUpstreamJson(
    `https://${HOST}/tv-zone-mobile-api/v1/channel/demand/list/${date}/json?channel_type=${channelType}&duration=1`,
    REFERER,
  );
  if (json.success !== true) {
    throw new Error(`上游返回 success=${String(json.success)}（code=${String(json.code)} ${str(json.message)}）`);
  }
  const data = asRecord(json.data);
  return { list: asArray(data?.data_list), lastTime: str(data?.last_time) || null };
}

/** playerName 是逗号分隔的可读串，平台名原样保留 */
function splitPlatforms(raw: string): string[] {
  return raw
    .split(',')
    .map((one) => one.trim())
    .filter(Boolean);
}

/** 上游无落地页字段故不返回 url；heat 是播放指数，score 是综合评分指数 */
function toItems(list: unknown[]): HotPlayItem[] {
  return list.flatMap((raw, index) => {
    const row = asRecord(raw);
    const title = row ? str(row.wikiTitle) || str(row.programName) : '';
    if (!row || !title) return [];
    return [{
      rank: index + 1,
      title,
      category: str(row.programTypeValue) || null,
      heat: num(row.playRate),
      score: num(row.score),
      platforms: splitPlatforms(str(row.playerName)),
    } satisfies HotPlayItem];
  });
}

interface Board {
  boardDate: string;
  items: HotPlayItem[];
}

function toResult(type: HotPlayType, board: Board, cached: boolean): HotPlayResult {
  return {
    type,
    boardDate: board.boardDate,
    // 东八区零点换算，UTC 串固定落在 16:00:00.000Z 边界
    updatedAt: new Date(`${board.boardDate}T00:00:00+08:00`).toISOString(),
    cached,
    items: board.items,
  };
}

/** 命中缓存时 cached=true；并发首请求合并成一次上游调用 */
const resolveHotPlay = createBoardCache<HotPlayType, Board, HotPlayResult>({
  slot: '__decamoreHotPlay',
  ttlMs: HOT_PLAY_CACHE_TTL_MS,
  fetch: async (type) => {
    const channelType = TYPE_CHANNEL[type];
    const today = ymd(new Date());

    let boardDate = today;
    let items: HotPlayItem[];
    try {
      const first = await fetchBoard(channelType, today);
      items = toItems(first.list);
      // 当天常为空，跟着 last_time 再取一次（官方站点同做法，实测最新只到 T-3）
      if (items.length === 0 && first.lastTime) {
        const second = await fetchBoard(channelType, first.lastTime);
        items = toItems(second.list);
        boardDate = first.lastTime;
      }
    } catch (error) {
      throw unavailable(type, error instanceof Error ? error.message : String(error));
    }
    if (items.length === 0) throw unavailable(type, `上游 ${today} 与 last_time 都没有榜单数据`);
    return { boardDate, items };
  },
  toResult,
});

/** limit 只截 items：缓存与 single-flight 仍按全量共享 */
export async function getHotPlay(type: HotPlayType, limit?: number): Promise<HotPlayResult> {
  const result = await resolveHotPlay(type);
  return limit ? { ...result, items: result.items.slice(0, limit) } : result;
}

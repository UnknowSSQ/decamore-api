/** 热歌榜三家上游抓取；端点均匿名可访问，免 cookie 与签名 */
import 'server-only';

import { asArray, asRecord, getUpstreamJson, num, str } from './upstream';
import { ERROR_CODE, type HotMusicItem, type HotMusicPlatform, type HotMusicResult } from '@/types';
import { ApiError } from './errors';

export const HOT_MUSIC_CACHE_TTL_MS = 60_000;
export const DEFAULT_HOT_MUSIC_PLATFORM: HotMusicPlatform = 'qq';
/** 上游一次给 300 / 200 首，对外只留前 30 */
export const HOT_MUSIC_LIMIT = 30;

const PLATFORM_LABEL: Record<HotMusicPlatform, string> = {
  qq: 'QQ音乐',
  netease: '网易云音乐',
  kugou: '酷狗音乐',
};

interface UpstreamChart {
  chartName: string;
  items: HotMusicItem[];
  updatedAtMs: number;
}

function unavailable(platform: HotMusicPlatform, reason: string): ApiError {
  return new ApiError(503, ERROR_CODE.SERVICE_UNAVAILABLE, `${PLATFORM_LABEL[platform]}热歌榜暂时取不到`, {
    description: reason,
  });
}

/** 只到日期的串按东八区零点算，QQ 榜单只给到日 */
function dateOnlyToEpochMs(raw: string): number | null {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!matched) return null;
  const ms = Date.parse(`${raw.trim()}T00:00:00+08:00`);
  return Number.isNaN(ms) ? null : ms;
}

function joinNames(value: unknown, key: string): string {
  return asArray(value)
    .map((one) => str(asRecord(one)?.[key]))
    .filter(Boolean)
    .join('/');
}

/** topid=26 即「巅峰榜·热歌」 */
async function fetchQq(): Promise<UpstreamChart> {
  const json = await getUpstreamJson(
    'https://c.y.qq.com/v8/fcg-bin/fcg_v8_toplist_cp.fcg?topid=26&format=json',
    'https://y.qq.com/',
  );
  const rows = asArray(json.songlist);

  const items = rows.flatMap((raw, index) => {
    const song = asRecord(asRecord(raw)?.data);
    const title = song ? str(song.songname) : '';
    const mid = song ? str(song.songmid) : '';
    if (!song || !title || !mid) return [];
    return [{
      rank: index + 1,
      title,
      artists: joinNames(song.singer, 'name'),
      album: str(song.albumname) || null,
      duration: num(song.interval),
      url: `https://y.qq.com/n/yqq/song/${encodeURIComponent(mid)}.html`,
    } satisfies HotMusicItem];
  });

  return {
    chartName: str(asRecord(json.topinfo)?.ListName) || '热歌榜',
    items,
    // update_time 只给到日期，没有时刻
    updatedAtMs: dateOnlyToEpochMs(str(json.update_time)) ?? Date.now(),
  };
}

/** id=3778678 即「热歌榜」歌单 */
async function fetchNetease(): Promise<UpstreamChart> {
  const json = await getUpstreamJson(
    'https://music.163.com/api/playlist/detail?id=3778678',
    'https://music.163.com/',
  );
  const result = asRecord(json.result);
  const rows = asArray(result?.tracks);

  const items = rows.flatMap((raw, index) => {
    const track = asRecord(raw);
    const title = track ? str(track.name) : '';
    const id = track ? num(track.id) : null;
    if (!track || !title || id === null) return [];
    return [{
      // 上游 position 与实际顺序对不上，按返回顺序编号
      rank: index + 1,
      title,
      artists: joinNames(track.artists, 'name'),
      album: str(asRecord(track.album)?.name) || null,
      duration: (() => {
        const ms = num(track.duration);
        return ms === null ? null : Math.round(ms / 1000);
      })(),
      url: `https://music.163.com/song?id=${id}`,
    } satisfies HotMusicItem];
  });

  const updateTime = num(result?.updateTime);
  return {
    chartName: str(result?.name) || '热歌榜',
    items,
    updatedAtMs: updateTime ?? Date.now(),
  };
}

/** rankid=8888 即「TOP500」，一页 30 首 */
async function fetchKugou(): Promise<UpstreamChart> {
  const json = await getUpstreamJson(
    'https://m.kugou.com/rank/info/?rankid=8888&page=1&json=true',
    'https://m.kugou.com/rank/',
  );
  const songs = asRecord(json.songs);
  const rows = asArray(songs?.list);

  const items = rows.flatMap((raw, index) => {
    const song = asRecord(raw);
    const title = song ? str(song.songname) : '';
    if (!song || !title) return [];
    return [{
      rank: index + 1,
      title,
      artists: joinNames(song.authors, 'author_name'),
      // remark 是歌名的重复字段，不是专辑，宁可给 null
      album: null,
      duration: num(song.duration),
      url: str(song.song_url),
    } satisfies HotMusicItem];
  });

  // timestamp 是秒级，0 视作缺失
  const timestamp = num(songs?.timestamp);
  return {
    chartName: str(asRecord(json.info)?.rankname) || 'TOP500',
    items,
    updatedAtMs: timestamp !== null && timestamp > 0 ? timestamp * 1000 : Date.now(),
  };
}

const FETCHERS: Record<HotMusicPlatform, () => Promise<UpstreamChart>> = {
  qq: fetchQq,
  netease: fetchNetease,
  kugou: fetchKugou,
};

interface CacheEntry {
  at: number;
  chart: UpstreamChart;
}

/** 缓存挂 globalThis：Next 按 route 分包，模块级变量每个 chunk 各存一份 */
const globalStore = globalThis as typeof globalThis & {
  __decamoreHotMusic?: Partial<Record<HotMusicPlatform, CacheEntry>>;
};

const cache = (globalStore.__decamoreHotMusic ??= {});
const inflight = new Map<HotMusicPlatform, Promise<HotMusicResult>>();

function toResult(platform: HotMusicPlatform, entry: CacheEntry, cached: boolean): HotMusicResult {
  return {
    platform,
    chartName: entry.chart.chartName,
    updatedAt: new Date(entry.chart.updatedAtMs).toISOString(),
    cached,
    items: entry.chart.items.slice(0, HOT_MUSIC_LIMIT),
  };
}

async function load(platform: HotMusicPlatform): Promise<HotMusicResult> {
  let chart: UpstreamChart;
  try {
    chart = await FETCHERS[platform]();
  } catch (error) {
    throw unavailable(platform, error instanceof Error ? error.message : String(error));
  }
  if (chart.items.length === 0) throw unavailable(platform, '上游返回的结构里没有可用曲目');

  const entry: CacheEntry = { at: Date.now(), chart };
  cache[platform] = entry;
  return toResult(platform, entry, false);
}

/** 命中缓存时 cached=true；并发首请求合并成一次上游调用 */
export async function getHotMusic(platform: HotMusicPlatform): Promise<HotMusicResult> {
  const entry = cache[platform];
  if (entry && Date.now() - entry.at < HOT_MUSIC_CACHE_TTL_MS) return toResult(platform, entry, true);

  const pending = inflight.get(platform);
  if (pending) return pending;

  const task = load(platform).finally(() => inflight.delete(platform));
  inflight.set(platform, task);
  return task;
}

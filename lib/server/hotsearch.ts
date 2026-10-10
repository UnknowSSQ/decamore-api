/** 热搜榜四家上游抓取；端点均匿名可访问，免 cookie 与签名 */
import 'server-only';

import { asArray, asRecord, getUpstreamJson, num, str } from './upstream';
import { ERROR_CODE, type HotSearchItem, type HotSearchPlatform, type HotSearchResult } from '@/types';
import { ApiError } from './errors';

export const HOT_SEARCH_CACHE_TTL_MS = 60_000;
export const DEFAULT_HOT_SEARCH_PLATFORM: HotSearchPlatform = 'weibo';

const PLATFORM_LABEL: Record<HotSearchPlatform, string> = {
  weibo: '微博',
  douyin: '抖音',
  baidu: '百度',
  zhihu: '知乎',
};

interface UpstreamBoard {
  items: HotSearchItem[];
  updatedAtMs: number;
}

function unavailable(platform: HotSearchPlatform, reason: string): ApiError {
  return new ApiError(503, ERROR_CODE.SERVICE_UNAVAILABLE, `${PLATFORM_LABEL[platform]}热搜暂时取不到`, {
    description: reason,
  });
}

/** 「2017 万热度」→ 20170000；解析不出返回 null（原样留在 heatLabel 里） */
function parseHeatText(text: string): number | null {
  const matched = /(\d[\d,]*)\s*(亿|万|[wW])?/.exec(text);
  const base = matched ? num(matched[1] ?? '') : null;
  if (base === null) return null;
  const unit = matched?.[2];
  const factor = unit === '亿' ? 1e8 : unit === '万' || unit === 'w' || unit === 'W' ? 1e4 : 1;
  return Math.round(base * factor);
}

/** 抖音的 active_time 形如「2026-10-08 19:14:26」，是东八区本地时间且不带时区标记 */
function parseChinaLocalTime(raw: string): number | null {
  const matched = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(raw.trim());
  if (!matched) return null;
  const [, y, mo, d, h, mi, s] = matched;
  if (!y || !mo || !d || !h || !mi || !s) return null;
  const ms = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h) - 6, Number(mi), Number(s));
  return Number.isFinite(ms) ? ms : null;
}

/** 秒级时间戳统一成毫秒；不在秒级区间就当无效 */
function fromEpochSeconds(value: number | null): number | null {
  if (value === null || value < 1_000_000_000 || value > 1e11) return null;
  return value * 1000;
}

async function fetchWeibo(): Promise<UpstreamBoard> {
  const json = await getUpstreamJson('https://weibo.com/ajax/side/hotSearch', 'https://weibo.com/');
  const rows = asArray(asRecord(json.data)?.realtime);

  const items = rows.flatMap((raw, index) => {
    const row = asRecord(raw);
    const title = row ? str(row.word) || str(row.note) : '';
    if (!row || !title) return [];
    const position = num(row.realpos);
    const topic = num(row.topic_flag) === 1;
    const query = topic ? `#${title}#` : title;
    return [{
      rank: position && position > 0 ? position : index + 1,
      title,
      heat: num(row.num),
      heatLabel: null,
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent(query)}`,
    } satisfies HotSearchItem];
  });

  return { items, updatedAtMs: Date.now() };
}

async function fetchDouyin(): Promise<UpstreamBoard> {
  const json = await getUpstreamJson(
    'https://www.douyin.com/aweme/v1/web/hot/search/list/?device_platform=webapp&aid=6383&channel=channel_pc_web',
    'https://www.douyin.com/',
  );
  const data = asRecord(json.data);
  const rows = asArray(data?.word_list);
  const updatedAtMs = parseChinaLocalTime(str(data?.active_time)) ?? Date.now();

  const items = rows.flatMap((raw, index) => {
    const row = asRecord(raw);
    const title = row ? str(row.word) : '';
    if (!row || !title) return [];
    const position = num(row.position);
    const sentenceId = str(row.sentence_id);
    return [{
      rank: position && position > 0 ? position : index + 1,
      title,
      heat: num(row.hot_value),
      heatLabel: null,
      url: sentenceId
        ? `https://www.douyin.com/hot/${encodeURIComponent(sentenceId)}`
        : `https://www.douyin.com/search/${encodeURIComponent(title)}`,
    } satisfies HotSearchItem];
  });

  return { items, updatedAtMs };
}

async function fetchBaidu(): Promise<UpstreamBoard> {
  const json = await getUpstreamJson(
    'https://top.baidu.com/api/board?platform=pc&tab=realtime',
    'https://top.baidu.com/',
  );
  const card = asRecord(asArray(asRecord(json.data)?.cards)[0]);
  const rows = asArray(card?.content);
  const updatedAtMs = fromEpochSeconds(num(card?.updateTime)) ?? Date.now();

  const items = rows.flatMap((raw, index) => {
    const row = asRecord(raw);
    const title = row ? str(row.word) : '';
    if (!row || !title) return [];
    const position = num(row.index);
    const link = str(row.url) || `https://www.baidu.com/s?wd=${encodeURIComponent(title)}`;
    return [{
      // 百度的 index 是 0 基
      rank: position !== null && position >= 0 ? position + 1 : index + 1,
      title,
      heat: num(row.hotScore),
      heatLabel: null,
      url: link,
    } satisfies HotSearchItem];
  });

  return { items, updatedAtMs };
}

async function fetchZhihu(): Promise<UpstreamBoard> {
  const json = await getUpstreamJson('https://api.zhihu.com/topstory/hot-list?limit=50', 'https://www.zhihu.com/');
  const rows = asArray(json.data);

  const items = rows.flatMap((raw, index) => {
    const row = asRecord(raw);
    const target = asRecord(row?.target);
    const title = target ? str(target.title) : '';
    if (!row || !target || !title) return [];
    const detailText = str(row.detail_text);
    return [{
      rank: index + 1,
      title,
      heat: parseHeatText(detailText),
      heatLabel: detailText || null,
      url: zhihuWebUrl(str(target.url), str(row.card_id), title),
    } satisfies HotSearchItem];
  });

  // 知乎只给一句「热榜已更新」，无可解析时间戳
  return { items, updatedAtMs: Date.now() };
}

/** 换成网页直链；question id 超出安全整数，只能按字符串拼 */
function zhihuWebUrl(targetUrl: string, cardId: string, title: string): string {
  const questionFromApi = /^https:\/\/api\.zhihu\.com\/questions\/(\d+)/.exec(targetUrl)?.[1];
  if (questionFromApi) return `https://www.zhihu.com/question/${questionFromApi}`;

  const questionFromCard = /^Q_(\d+)$/.exec(cardId)?.[1];
  if (questionFromCard) return `https://www.zhihu.com/question/${questionFromCard}`;

  if (/^https?:\/\/(www\.)?zhihu\.com\//.test(targetUrl)) return targetUrl;
  return `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(title)}`;
}

const FETCHERS: Record<HotSearchPlatform, () => Promise<UpstreamBoard>> = {
  weibo: fetchWeibo,
  douyin: fetchDouyin,
  baidu: fetchBaidu,
  zhihu: fetchZhihu,
};

interface CacheEntry {
  at: number;
  board: UpstreamBoard;
}

/** 缓存挂 globalThis：Next 按 route 分包，模块级变量每个 chunk 各存一份 */
const globalStore = globalThis as typeof globalThis & {
  __decamoreHotSearch?: Partial<Record<HotSearchPlatform, CacheEntry>>;
};

const cache = (globalStore.__decamoreHotSearch ??= {});
const inflight = new Map<HotSearchPlatform, Promise<HotSearchResult>>();

function toResult(platform: HotSearchPlatform, entry: CacheEntry, cached: boolean): HotSearchResult {
  return {
    platform,
    updatedAt: new Date(entry.board.updatedAtMs).toISOString(),
    cached,
    items: entry.board.items,
  };
}

async function load(platform: HotSearchPlatform): Promise<HotSearchResult> {
  let board: UpstreamBoard;
  try {
    board = await FETCHERS[platform]();
  } catch (error) {
    throw unavailable(platform, error instanceof Error ? error.message : String(error));
  }
  if (board.items.length === 0) throw unavailable(platform, '上游返回的结构里没有可用条目');

  const entry: CacheEntry = { at: Date.now(), board };
  cache[platform] = entry;
  return toResult(platform, entry, false);
}

/** 命中缓存时 cached=true；并发首请求合并成一次上游调用 */
async function resolveHotSearch(platform: HotSearchPlatform): Promise<HotSearchResult> {
  const entry = cache[platform];
  if (entry && Date.now() - entry.at < HOT_SEARCH_CACHE_TTL_MS) return toResult(platform, entry, true);

  const pending = inflight.get(platform);
  if (pending) return pending;

  const task = load(platform).finally(() => inflight.delete(platform));
  inflight.set(platform, task);
  return task;
}

/** limit 只截 items：缓存与 single-flight 仍按全量共享，同一份上游数据服务不同截断的请求 */
export async function getHotSearch(platform: HotSearchPlatform, limit?: number): Promise<HotSearchResult> {
  const result = await resolveHotSearch(platform);
  return limit ? { ...result, items: result.items.slice(0, limit) } : result;
}

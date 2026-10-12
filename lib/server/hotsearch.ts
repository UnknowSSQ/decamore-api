/** 热搜榜六家上游抓取；端点均匿名可访问，免 cookie 与签名 */
import 'server-only';

import { asArray, asRecord, getUpstreamJson, num, str } from './upstream';
import { createBoardCache } from './board-cache';
import { type HotSearchItem, type HotSearchPlatform, type HotSearchResult } from '@/types';
import { UpstreamUnavailableError } from './errors';

export const HOT_SEARCH_CACHE_TTL_MS = 60_000;
export const DEFAULT_HOT_SEARCH_PLATFORM: HotSearchPlatform = 'weibo';

const PLATFORM_LABEL: Record<HotSearchPlatform, string> = {
  weibo: '微博',
  douyin: '抖音',
  baidu: '百度',
  zhihu: '知乎',
  bilibili: 'B 站',
  toutiao: '今日头条',
};

interface UpstreamBoard {
  items: HotSearchItem[];
  updatedAtMs: number;
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

/**
 * B 站给的是「热门视频」而不是热搜词：s.search 那份 hotword 只有词、score 实测恒为 0，
 * 拿它当热榜会有一列全是空值，所以取 popular 的播放量当热度。
 */
async function fetchBilibili(): Promise<UpstreamBoard> {
  const json = await getUpstreamJson('https://api.bilibili.com/x/web-interface/popular', 'https://www.bilibili.com/');
  const rows = asArray(asRecord(json.data)?.list);

  const items = rows.flatMap((raw, index) => {
    const row = asRecord(raw);
    const title = row ? str(row.title) : '';
    if (!row || !title) return [];
    const bvid = str(row.bvid);
    const stat = asRecord(row.stat);
    return [{
      rank: index + 1,
      title,
      heat: num(stat?.view),
      heatLabel: null,
      url: bvid ? `https://www.bilibili.com/video/${encodeURIComponent(bvid)}` : `https://search.bilibili.com/all?keyword=${encodeURIComponent(title)}`,
    } satisfies HotSearchItem];
  });

  // 上游不给榜单生成时间，只能用抓取时刻
  return { items, updatedAtMs: Date.now() };
}

/**
 * 今日头条：data 就是榜单（另有一个 fixed_top_data 是置顶位，不参与排名），
 * HotValue 是字符串数字、实测 50 条严格降序，所以 rank 取下标、heat 直接转数值。
 * Url 有两种落地页（专题页与直播间的 webcast 链接），原样给，不改写成站内搜索。
 */
/**
 * 今日头条：data 就是榜单（另有一个 fixed_top_data 是置顶位，不参与排名），
 * HotValue 是字符串数字、实测 50 条严格降序，所以 rank 取下标、heat 直接转数值。
 */
function toutiaoUrl(raw: string, title: string, word: string): string {
  const fallback = `https://www.toutiao.com/search/?keyword=${encodeURIComponent(word || title)}`;
  if (!raw) return fallback;
  try {
    const parsed = new URL(raw);
    //  trending 页的链接挂了约 700 字符的 log_pb 跟踪参数（内嵌一段 JSON 与签名），榜单不需要它
    if (parsed.hostname.endsWith('toutiao.com') && parsed.pathname.startsWith('/trending/')) {
      return `${parsed.origin}${parsed.pathname}`;
    }
    return raw;
  } catch {
    return fallback;
  }
}

async function fetchToutiao(): Promise<UpstreamBoard> {
  const json = await getUpstreamJson('https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc', 'https://www.toutiao.com/');
  const rows = asArray(json.data);

  const items = rows.flatMap((raw, index) => {
    const row = asRecord(raw);
    const title = row ? str(row.Title) : '';
    if (!row || !title) return [];
    return [{
      rank: index + 1,
      title,
      heat: num(row.HotValue),
      heatLabel: null,
      url: toutiaoUrl(str(row.Url), title, str(row.QueryWord)),
    } satisfies HotSearchItem];
  });

  // 上游不给榜单生成时间，只能用抓取时刻
  return { items, updatedAtMs: Date.now() };
}

const FETCHERS: Record<HotSearchPlatform, () => Promise<UpstreamBoard>> = {
  weibo: fetchWeibo,
  douyin: fetchDouyin,
  baidu: fetchBaidu,
  zhihu: fetchZhihu,
  bilibili: fetchBilibili,
  toutiao: fetchToutiao,
};

function toResult(platform: HotSearchPlatform, board: UpstreamBoard, cached: boolean): HotSearchResult {
  return {
    platform,
    updatedAt: new Date(board.updatedAtMs).toISOString(),
    cached,
    items: board.items,
  };
}

/** 命中缓存时 cached=true；并发首请求合并成一次上游调用 */
const resolveHotSearch = createBoardCache<HotSearchPlatform, UpstreamBoard, HotSearchResult>({
  slot: '__decamoreHotSearch',
  ttlMs: HOT_SEARCH_CACHE_TTL_MS,
  fetch: async (platform) => {
    let board: UpstreamBoard;
    try {
      board = await FETCHERS[platform]();
    } catch (error) {
      throw new UpstreamUnavailableError(`${PLATFORM_LABEL[platform]}热搜`, error instanceof Error ? error.message : String(error));
    }
    if (board.items.length === 0) throw new UpstreamUnavailableError(`${PLATFORM_LABEL[platform]}热搜`, '上游返回的结构里没有可用条目');
    return board;
  },
  toResult,
});

/** limit 只截 items：缓存与 single-flight 仍按全量共享，同一份上游数据服务不同截断的请求 */
export async function getHotSearch(platform: HotSearchPlatform, limit?: number): Promise<HotSearchResult> {
  const result = await resolveHotSearch(platform);
  return limit ? { ...result, items: result.items.slice(0, limit) } : result;
}

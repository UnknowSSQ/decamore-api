/**
 * 气象预警：中央气象台 www.nmc.cn 的 rest/findAlarm，免 key、返回纯 JSON。
 * 上游的筛选值只认中文（实测 province=ABJ 回 0 条，province=北京市 才有），
 * 而本站参数面不放汉字，所以把在架全量取回来按码表在本地筛，缓存键因此只有一个、不会随筛选组合膨胀。
 * 上游列表项只有五个字段，类型与等级是从标题解析的，所以解析不出就是 null。
 */
import 'server-only';

import { LEVEL_BY_VALUE, SIGNAL_TYPE_BY_VALUE, WARNING_LEVELS, WARNING_REGIONS, WARNING_SIGNAL_TYPES } from '@/constants/warning-signals';
import { createBoardCache } from './board-cache';
import { UpstreamUnavailableError } from './errors';
import { asArray, asRecord, getUpstreamJson, num, str } from './upstream';
import { parseWallClock } from './time';
import type { WarningBoard, WarningLevel, WarningLevelCount, WarningSignalType, WeatherWarning } from '@/types';

const REFERER = 'https://www.nmc.cn/publish/alarm.html';
/** 与金价、热搜同档：预警随时可能新增，60 秒内的重复请求走缓存 */
export const WARNING_TTL_MS = 60_000;
/**
 * 一页 200 条实测 1.6–3.8 秒，500 条要 5.9 秒，所以取小页并并行翻页。
 * 在架量随天气起伏：傍晚大雾一来就从 330 涨到 668（totalPage=4）。
 */
const PAGE_SIZE = 200;
/** 五页 = 1,000 条封顶；再多就按 truncated 如实标出来 */
const MAX_PAGES = 5;

interface WarningPage {
  rows: unknown[];
  count: number;
  totalPage: number;
}

interface WarningBoardEntry {
  fetched: WeatherWarning[];
  /** 上游 data.page.count，本筛选项下的在架总数 */
  upstreamTotal: number;
  /** 取回不足 upstreamTotal（超过 MAX_PAGES）时为 true */
  truncated: boolean;
  updatedAtMs: number;
}

/** 类型名有互相包含的（道路结冰 / 结冰），先长后短地试才不会削错 */
const TYPE_VALUES_BY_LENGTH = [...WARNING_SIGNAL_TYPES]
  .sort((a, b) => b.value.length - a.value.length)
  .map((one) => one.value);

/**
 * 「辽宁省沈阳市新民市气象台发布大雾橙色预警信号」→ 发布单位、类型、等级。
 * 类型只认上游筛选器里那十三种，实测 668 条里有 41 条是筛选器没有的种类
 * （雷雨大风、地质灾害、山洪灾害、其它气象灾害……），它们照样返回，只是 signalType 为 null、
 * 也不能用 type 筛；等级按结尾的颜色取，所以这 41 条的 level 仍然是准的。
 * 机构锚带上「分局」——实测有「…气象分局发布霜冻蓝色预警信号」，只认「气象台」会让这类连等级都丢。
 * 「信号」二字上游会省（实测「…陕西省气象台发布山洪灾害黄色预警」就没有），所以尾缀整段可选。
 */
function parseTitle(title: string): { issuer: string; signalType: WarningSignalType | null; level: WarningLevel | null } {
  const matched = /^(.*)(?:气象台|分局)发布(.+?)(?:预警信号|预警)$/.exec(title.trim());
  if (!matched) return { issuer: title.trim(), signalType: null, level: null };
  const [, issuer, body] = matched;
  const signalText = TYPE_VALUES_BY_LENGTH.find((one) => body!.startsWith(one));
  const levelText = WARNING_LEVELS.map((one) => one.value).find((one) => body!.endsWith(one));
  return {
    issuer: issuer!.trim(),
    signalType: signalText ? (SIGNAL_TYPE_BY_VALUE.get(signalText) ?? null) : null,
    level: levelText ? (LEVEL_BY_VALUE.get(levelText) ?? null) : null,
  };
}

/** 上游只给区县级全称，省名按标题前缀认（实测「内蒙古自治区兴安盟突泉县…」以此可归到内蒙古） */
function regionOf(title: string): string | null {
  for (const one of WARNING_REGIONS) {
    if (title.startsWith(one.value)) return one.key;
  }
  return null;
}

function toWarning(row: Record<string, unknown>): WeatherWarning | null {
  const title = str(row.title);
  const alertId = str(row.alertid);
  if (!title || !alertId) return null;
  const { issuer, signalType, level } = parseTitle(title);
  // issuetime「2026-10-11 20:21」是北京时间，不给秒也不给时区
  const issuedAt = parseWallClock(str(row.issuetime), 'Asia/Shanghai');

  return {
    alertId,
    title,
    issuer,
    region: regionOf(title),
    signalType,
    level,
    icon: str(row.pic),
    url: `https://www.nmc.cn${str(row.url)}`,
    issuedAt,
  };
}

async function fetchPage(pageNo: number): Promise<WarningPage> {
  const json = await getUpstreamJson(
    `https://www.nmc.cn/rest/findAlarm?pageNo=${pageNo}&pageSize=${PAGE_SIZE}&signaltype=&signallevel=&province=`,
    REFERER,
  );
  const record = asRecord(asRecord(json.data)?.page);
  const count = num(record?.count) ?? 0;
  return {
    rows: asArray(record?.list),
    count,
    // 上游自己报 totalPage；万一没有就按 count 折算，再不行就只认这一页
    totalPage: num(record?.totalPage) ?? Math.ceil(count / PAGE_SIZE) ?? 1,
  };
}

function toWarnings(rows: unknown[]): WeatherWarning[] {
  return rows.flatMap((raw) => {
    const row = asRecord(raw);
    const warning = row ? toWarning(row) : null;
    return warning ? [warning] : [];
  });
}

async function fetchBoard(): Promise<WarningBoardEntry> {
  const first = await fetchPage(1);
  const wanted = Math.min(Math.max(first.totalPage, 1), MAX_PAGES);

  // 剩余页并行取：上游此刻 668 条要四页，串行两页实测就要 11.3 秒（单页 1.6–3.8 秒、500 条一页要 5.9 秒），
  // 并行是一波的耗时。某一页失败不整体作废——少取到的部分照发，truncated 标出来。
  const rest = wanted > 1 ? await Promise.allSettled(Array.from({ length: wanted - 1 }, (_, i) => fetchPage(i + 2))) : [];
  const pages = [first, ...rest.flatMap((one) => (one.status === 'fulfilled' ? [one.value] : []))];
  const rows = pages.flatMap((page) => page.rows);

  return {
    fetched: toWarnings(rows),
    upstreamTotal: first.count,
    truncated: rows.length < first.count || first.totalPage > MAX_PAGES,
    updatedAtMs: Date.now(),
  };
}

/** 缓存里存的是「在架全量 + 上游总数」，筛选与截断都放在缓存之外做，键才只有 all 一个 */
interface WarningSnapshot {
  updatedAt: string;
  cached: boolean;
  upstreamTotal: number;
  truncated: boolean;
  items: WeatherWarning[];
}

const resolveSnapshot = createBoardCache<string, WarningBoardEntry, WarningSnapshot>({
  slot: '__decamoreWeatherWarning',
  ttlMs: WARNING_TTL_MS,
  fetch: async () => {
    try {
      return await fetchBoard();
    } catch (error) {
      throw new UpstreamUnavailableError('气象预警', error instanceof Error ? error.message : String(error));
    }
  },
  toResult: (_key, entry, cached) => ({
    updatedAt: new Date(entry.updatedAtMs).toISOString(),
    cached,
    upstreamTotal: entry.upstreamTotal,
    truncated: entry.truncated,
    items: entry.fetched,
  }),
});

function emptyLevelCount(): WarningLevelCount {
  const base = {} as WarningLevelCount;
  for (const one of WARNING_LEVELS) base[one.key] = 0;
  return base;
}

/** 三个筛选条件是「与」的关系；matched 与 levelCount 都在 limit 截断之前算 */
export async function getWeatherWarnings(
  filter: { type?: WarningSignalType; level?: WarningLevel; region?: string },
  limit?: number,
): Promise<WarningBoard> {
  const snapshot = await resolveSnapshot('all');
  const matched = snapshot.items.filter(
    (one) =>
      (!filter.type || one.signalType === filter.type) &&
      (!filter.level || one.level === filter.level) &&
      (!filter.region || one.region === filter.region),
  );

  const levelCount = emptyLevelCount();
  for (const one of matched) {
    if (one.level) levelCount[one.level] += 1;
  }

  return {
    updatedAt: snapshot.updatedAt,
    cached: snapshot.cached,
    upstreamTotal: snapshot.upstreamTotal,
    truncated: snapshot.truncated,
    matched: matched.length,
    levelCount,
    items: limit ? matched.slice(0, limit) : matched,
  };
}

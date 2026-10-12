/**
 * 台风：中央气象台台风网的公开 JSONP 接口，免 cookie 免签名。
 * 列表一次给全部编号（实测 32 条，其中在架 1 条），路径要按 id 另取一次（实测 51 个时次）。
 */
import 'server-only';

import { asArray, getUpstreamJson, num, str } from './upstream';
import { createBoardCache } from './board-cache';
import { type TyphoonBrief, type TyphoonResult, type TyphoonTrack, type TyphoonTrackPoint } from '@/types';
import { UpstreamUnavailableError } from './errors';

const LIST_URL = 'https://typhoon.nmc.cn/weatherservice/typhoon/jsons/list_default';
const TRACK_URL = (id: number) => `https://typhoon.nmc.cn/weatherservice/typhoon/jsons/view_${id}`;
const REFERER = 'https://typhoon.nmc.cn/';
/** 列表与路径同档：路径点本身是 3 小时一个时次，上游不会更快 */
export const TYPHOON_TTL_MS = 10 * 60_000;

/** 上游的强度写法大小写不统一（SuperTY 与预报里的 STY 并存），只按实测见过的这几档给中文名 */
const STRENGTH_LABEL: Record<string, string> = {
  TD: '热带低压',
  TS: '热带风暴',
  STS: '强热带风暴',
  TY: '台风',
  STY: '强台风',
  SUPERTY: '超强台风',
};

/** 列表项与明细头部的标量部分同构，前 8 列一样 */
function toBrief(row: unknown): TyphoonBrief | null {
  const cols = asArray(row);
  const id = num(cols[0]);
  const name = str(cols[1]);
  const cname = str(cols[2]).trim();
  const code = str(cols[3]);
  if (id === null || !name || !cname || !code) return null;
  return {
    id,
    code,
    name,
    cname,
    meaning: str(cols[6]).trim() || null,
    active: str(cols[7]) === 'start',
  };
}

async function fetchList(): Promise<TyphoonBrief[]> {
  const json = await getUpstreamJson(LIST_URL, REFERER);
  const briefs = asArray(json.typhoonList).map(toBrief).filter((one): one is TyphoonBrief => one !== null);
  if (briefs.length === 0) throw new Error('上游列表里没有可用台风');
  return briefs;
}

function toPoint(row: unknown): TyphoonTrackPoint | null {
  const cols = asArray(row);
  const at = num(cols[2]);
  const lon = num(cols[4]);
  const lat = num(cols[5]);
  if (at === null || lon === null || lat === null) return null;
  const strength = str(cols[3]).trim();
  return {
    time: new Date(at).toISOString(),
    strength,
    strengthLabel: STRENGTH_LABEL[strength.toUpperCase()] ?? null,
    lon,
    lat,
    pressure: num(cols[6]),
    windSpeed: num(cols[7]),
    direction: str(cols[8]).trim() || null,
    moveSpeed: num(cols[9]),
  };
}

async function fetchTrack(id: number): Promise<TyphoonTrack> {
  const json = await getUpstreamJson(TRACK_URL(id), REFERER);
  const head = toBrief(asArray(json.typhoon).slice(0, 8));
  if (!head) throw new Error('台风明细里没有身份信息');
  const points = asArray(asArray(json.typhoon).find((one) => Array.isArray(one)))
    .map(toPoint)
    .filter((one): one is TyphoonTrackPoint => one !== null);
  if (points.length === 0) throw new Error('台风路径里没有可用时次');
  return { id: head.id, name: head.name, cname: head.cname, code: head.code, active: head.active, points, cached: false };
}

const resolveList = createBoardCache<'default', TyphoonBrief[], TyphoonResult>({
  slot: '__decamoreTyphoonList',
  ttlMs: TYPHOON_TTL_MS,
  fetch: async () => {
    try {
      return await fetchList();
    } catch (error) {
      throw new UpstreamUnavailableError('台风信息', error instanceof Error ? error.message : String(error));
    }
  },
  toResult: (_key, list, cached) => ({ active: list.filter((one) => one.active), list, cached }),
});

const resolveTrack = createBoardCache<string, TyphoonTrack, TyphoonTrack>({
  slot: '__decamoreTyphoonTrack',
  ttlMs: TYPHOON_TTL_MS,
  fetch: async (id) => {
    try {
      return await fetchTrack(Number(id));
    } catch (error) {
      throw new UpstreamUnavailableError('台风信息', error instanceof Error ? error.message : String(error));
    }
  },
});

export function getTyphoonList(): Promise<TyphoonResult> {
  return resolveList('default');
}

export function getTyphoonTrack(id: number): Promise<TyphoonTrack> {
  return resolveTrack(String(id));
}

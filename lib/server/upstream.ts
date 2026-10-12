/** 上游抓取公共件：统一浏览器头、出口并发闸与 unknown 收敛，平台差异留在各自模块 */
import 'server-only';

import { acquireUpstreamSlot } from '@/utils/upstream-gate';

/** 浏览器常见的 UA：几家平台会按 UA 决定给不给完整 JSON */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

export const UPSTREAM_TIMEOUT_MS = 8_000;

/**
 * 连不上/超时后的短时熔断。没有它时上游宕机会让每次页面加载、每张榜卡都重新等满
 * 8 秒——正缓存只在成功时写，失败路径什么都不留。
 * 挂 globalThis：这些模块按 route 分包，模块级 Map 每个 chunk 各一份。
 */
const FAILURE_COOLDOWN_MS = 15_000;
const FAILURE_KEYS_TO_KEEP = 200;

const globalStore = globalThis as typeof globalThis & {
  __decamoreUpstreamFailures?: Map<string, { at: number; message: string }>;
};

const failures = (globalStore.__decamoreUpstreamFailures ??= new Map());

function rememberFailure(url: string, message: string): void {
  if (failures.size >= FAILURE_KEYS_TO_KEEP) failures.clear();
  failures.set(url, { at: Date.now(), message });
}

function cooledDown(url: string): { at: number; message: string } | null {
  const hit = failures.get(url);
  if (!hit) return null;
  return Date.now() - hit.at < FAILURE_COOLDOWN_MS ? hit : null;
}

type UnknownRecord = Record<string, unknown>;

export const asRecord = (value: unknown): UnknownRecord | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;

export const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** 上游偶尔把数字塞进字符串，这里统一收成 string */
export const str = (value: unknown): string =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';

/** 收成数值：容忍「1,225」这类带逗号的字符串；收不出为 null，不猜 */
export const num = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

/** 抓取原始响应体：并发闸、冷却、超时、非 200 都在这条路上，怎么解码交给调用方 */
async function upstreamBytes(url: string, init: RequestInit): Promise<Uint8Array> {
  const cooling = cooledDown(url);
  if (cooling) {
    throw new Error(
      `上游在冷却中，约 ${Math.ceil((FAILURE_COOLDOWN_MS - (Date.now() - cooling.at)) / 1000)} 秒后重试（上次：${cooling.message}）`,
    );
  }

  // 排队等不到名额时直接抛：这条路没有真的失败，不该给它记冷却
  const release = await acquireUpstreamSlot(new URL(url).host);
  try {
    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    } catch (error) {
      // 只给连不上与超时记冷却：HTTP 4xx/5xx 与坏 JSON 本来就秒回，冷却它们只会把可恢复的抖动放大成 15 秒不可用
      const message = error instanceof Error ? error.message : String(error);
      rememberFailure(url, message);
      throw new Error(`上游请求失败：${message}`);
    }
    failures.delete(url);
    if (!response.ok) throw new Error(`上游返回 HTTP ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  } finally {
    release();
  }
}

/** Response.text() 按规范只认 UTF-8，声明 charset=GBK 的上游要靠调用方自己解 */
async function upstreamText(url: string, init: RequestInit): Promise<string> {
  return Buffer.from(await upstreamBytes(url, init)).toString('utf8');
}

/**
 * 从响应体里取 JSON 对象。几家上游把它包在别的东西里——NMC 是 JSONP 的
 * `cb(({...}))`、中国天气网是 `var dataSK={...}`，所以取第一个 { 到最后一个 } 而不是整串 parse。
 */
function parseJsonObject(raw: string): UnknownRecord {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error(`上游响应里没有 JSON 对象（前 60 字符：${raw.slice(0, 60)}…）`);
  const parsed: unknown = JSON.parse(raw.slice(start, end + 1));
  const record = asRecord(parsed);
  if (!record) throw new Error('顶层不是 JSON 对象');
  return record;
}

async function upstreamJson(url: string, init: RequestInit): Promise<UnknownRecord> {
  const raw = await upstreamText(url, init);
  try {
    return parseJsonObject(raw);
  } catch {
    throw new Error(`上游返回的不是合法 JSON（前 60 字符：${raw.slice(0, 60)}…）`);
  }
}

/** 浏览器头一组三件：几家上游按 UA / referer 决定给不给完整数据 */
export const browserHeaders = (referer: string, extra?: Record<string, string>): Record<string, string> => ({
  'user-agent': USER_AGENT,
  accept: 'application/json, text/plain, */*',
  referer,
  ...extra,
});

/**
 * 非 200 / 非 JSON / 超时一律抛普通 Error，由调用方换成对外错误。
 * JSONP 回调与 `var x = {...}` 这类包裹也能取——NMC 与中国天气网就是这种响应。
 */
export function getUpstreamJson(url: string, referer: string, extraHeaders?: Record<string, string>): Promise<UnknownRecord> {
  return upstreamJson(url, { headers: browserHeaders(referer, extraHeaders), redirect: 'follow' });
}

/** 原样取字节：腾讯行情是 GBK，必须自己按声明的编码解，走 text() 会得到替换字符 */
export function getUpstreamBytes(url: string, referer: string, extraHeaders?: Record<string, string>): Promise<Uint8Array> {
  return upstreamBytes(url, { headers: browserHeaders(referer, extraHeaders), redirect: 'follow' });
}

/**
 * 表单 POST：网易的曲库与评论接口只认 x-www-form-urlencoded，GET 同一个地址会回登录页。
 * 与 GET 共用冷却与超时，差别只有方法、content-type 与表单体。
 */
export function postUpstreamForm(
  url: string,
  form: Record<string, string | number>,
  referer: string,
  extraHeaders?: Record<string, string>,
): Promise<UnknownRecord> {
  const body = new URLSearchParams(
    Object.entries(form).map(([key, value]) => [key, String(value)]),
  ).toString();
  return upstreamJson(url, {
    method: 'POST',
    headers: { ...browserHeaders(referer, extraHeaders), 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
}

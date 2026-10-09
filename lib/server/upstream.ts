/** 上游抓取公共件：统一浏览器头与 unknown 收敛，平台差异留在各自模块 */
import 'server-only';

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

export type UnknownRecord = Record<string, unknown>;

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

/** 非 200 / 非 JSON / 超时一律抛普通 Error，由调用方换成对外错误 */
export async function getUpstreamJson(url: string, referer: string, extraHeaders?: Record<string, string>): Promise<UnknownRecord> {
  const cooling = cooledDown(url);
  if (cooling) {
    throw new Error(
      `上游在冷却中，约 ${Math.ceil((FAILURE_COOLDOWN_MS - (Date.now() - cooling.at)) / 1000)} 秒后重试（上次：${cooling.message}）`,
    );
  }

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'application/json, text/plain, */*', referer, ...extraHeaders },
      redirect: 'follow',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    // 只给连不上与超时记冷却：HTTP 4xx/5xx 与坏 JSON 本来就秒回，冷却它们只会把可恢复的抖动放大成 15 秒不可用
    const message = error instanceof Error ? error.message : String(error);
    rememberFailure(url, message);
    throw new Error(`上游请求失败：${message}`);
  }
  failures.delete(url);
  if (!response.ok) throw new Error(`上游返回 HTTP ${response.status}`);

  const raw = await response.text();
  try {
    const json = asRecord(JSON.parse(raw));
    if (!json) throw new Error('顶层不是 JSON 对象');
    return json;
  } catch {
    throw new Error(`上游返回的不是合法 JSON（前 60 字符：${raw.slice(0, 60)}…）`);
  }
}

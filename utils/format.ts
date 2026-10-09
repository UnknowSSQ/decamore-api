/** 全部为纯函数、不碰浏览器 API，服务端组件可直接用 */

export function formatNumber(value: number, fractionDigits = 0): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** 中文计数：1 万以上折「万」，1 亿以上折「亿」 */
export function formatCompactCn(value: number): string {
  if (value < 10_000) return formatNumber(value);
  if (value < 100_000_000) return `${(value / 10_000).toFixed(value < 100_000 ? 2 : 1)}万`;
  return `${(value / 100_000_000).toFixed(2)}亿`;
}

/** 传入已是百分数（12.4）时用默认的 fromRatio=false */
export function formatPercent(value: number, digits = 1, fromRatio = false): string {
  const pct = fromRatio ? value * 100 : value;
  return `${pct.toFixed(digits)}%`;
}

/** 1 秒内取整到 ms，否则两位小数秒 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/** 2026-10-07 18:20:31 */
export function formatDateTime(input: string | number | Date): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '--';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}:${pad(d.getSeconds())}`;
}

/** 2026-10-07 */
export function formatDate(input: string | number | Date): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '--';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 3 分钟前 / 昨天 18:20 */
export function formatRelativeTime(input: string | number | Date, now = Date.now()): string {
  const t = new Date(input).getTime();
  if (Number.isNaN(t)) return '--';
  const diff = Math.floor((now - t) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 172800) return `昨天 ${new Date(t).toTimeString().slice(0, 5)}`;
  return formatDate(t);
}

/** 18:20:31，24 小时制 */
export function formatClock(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone,
  }).format(date);
}

/** 2026年10月07日 星期二 */
export function formatLongDate(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    weekday: 'long',
    timeZone,
  }).format(date);
}

/** HH:mm */
export function formatZoneTime(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }).format(date);
  } catch {
    // 非法时区不抛错，回退本地时间，保证 UI 不崩
    return formatClock(date).slice(0, 5);
  }
}

/** UTC+08:00 */
export function formatZoneOffset(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  }).formatToParts(date);
  const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  return name.replace('GMT', 'UTC').replace('UTC', 'UTC');
}


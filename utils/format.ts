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


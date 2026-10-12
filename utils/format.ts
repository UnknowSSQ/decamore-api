/** 全部为纯函数、不碰浏览器 API，服务端组件可直接用 */

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/** 中文计数：1 万以上折「万」，1 亿以上折「亿」 */
export function formatCompactCn(value: number): string {
  if (value < 10_000) return formatNumber(value);
  if (value < 100_000_000) return `${(value / 10_000).toFixed(value < 100_000 ? 2 : 1)}万`;
  return `${(value / 100_000_000).toFixed(2)}亿`;
}

/** 传入的必须已经是百分数（12.4 表示 12.4%） */
export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/** 1 秒内取整到 ms，否则两位小数秒 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/** 站点「时间与显示」设置；由后台写入，渲染前一律当作不可信输入处理 */
export interface DisplayPrefs {
  timeZone?: string;
  dateFormat?: 'iso' | 'cn' | 'us';
}

/**
 * 按目标时区拆出年月日与时分秒。
 * timezone 是后台自由填写的 IANA 名，写错时 Intl 会抛 RangeError——那是显示设置，
 * 不该让整个控制台白屏，所以退回到系统时区而不是往上抛。
 */
function zoneParts(input: string | number | Date, timeZone?: string) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const options: Intl.DateTimeFormatOptions = {
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  };
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-GB', { ...options, timeZone }).formatToParts(d);
  } catch {
    parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(d);
  }
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;
  return {
    year: map.year ?? '----',
    month: map.month ?? '--',
    day: map.day ?? '--',
    hour: map.hour ?? '00',
    minute: map.minute ?? '00',
    second: map.second ?? '00',
  };
}

/** 2026-10-07 18:20:31（日期部分跟随 prefs.dateFormat） */
export function formatDateTime(input: string | number | Date, prefs: DisplayPrefs = {}): string {
  const p = zoneParts(input, prefs.timeZone);
  if (!p) return '--';
  return `${formatDate(input, prefs)} ${p.hour}:${p.minute}:${p.second}`;
}

/** iso 2026-10-07 / cn 2026年10月07日 / us 10/07/2026 */
export function formatDate(input: string | number | Date, prefs: DisplayPrefs = {}): string {
  const p = zoneParts(input, prefs.timeZone);
  if (!p) return '--';
  switch (prefs.dateFormat ?? 'iso') {
    case 'cn':
      return `${p.year}年${p.month}月${p.day}日`;
    case 'us':
      return `${p.month}/${p.day}/${p.year}`;
    default:
      return `${p.year}-${p.month}-${p.day}`;
  }
}

/** 18:20:31，24 小时制 */
export function formatClock(date: Date, timeZone?: string): string {
  return safeIntl(
    date,
    { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' },
    timeZone,
  );
}

/** 2026年10月07日 星期二 */
export function formatLongDate(date: Date, timeZone?: string): string {
  return safeIntl(date, { year: 'numeric', month: 'long', day: '2-digit', weekday: 'long' }, timeZone);
}

/** 与 zoneParts 同样的取舍：时区名写错只该丢时区，不该丢整页 */
function safeIntl(date: Date, options: Intl.DateTimeFormatOptions, timeZone?: string): string {
  try {
    return new Intl.DateTimeFormat('zh-CN', { ...options, timeZone }).format(date);
  } catch {
    return new Intl.DateTimeFormat('zh-CN', options).format(date);
  }
}


/**
 * 上游普遍只给「当地墙上时间」，不带时区标记（腾讯行情、中央气象台都是这样），
 * 换成 ISO 就必须知道交易所时区。美股有夏令时，所以偏移查两次：
 * 第一次拿「墙上时间当 UTC」去猜时刻，用查到的偏移校正后再查一次，落在切换两侧才不会取错。
 */

/**
 * 认三种实测形态：
 * A 股紧凑 14 位 `20261009161459`；港交所带斜杠 `2026/10/09 16:08:14`；
 * 美股与气象台带横杠 `2026-10-09 16:00:01`、`2026-10-11 20:21`（气象台不给秒）。
 */
const COMPACT = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/;
const STAMP = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Intl.DateTimeFormat 构造不便宜（实测每次 0.057ms，预警一次全量 668 条要建 1,336 个 = 76ms），
 * 而它按语言 + 时区固定不变，所以一个时区建一个留着复用；未知时区在构造时就抛，正好由调用侧兜住。
 */
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timeZone);
  if (cached) return cached;
  const created = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  formatters.set(timeZone, created);
  return created;
}

/** 该时区在 at（UTC 毫秒）那一刻的偏移，毫秒，东八区为正 */
function zoneOffsetMs(at: number, timeZone: string): number {
  const parts = formatterFor(timeZone).formatToParts(new Date(at));
  const value = (type: string): number => Number(parts.find((one) => one.type === type)?.value ?? '0');
  // en-US 在 hour12:false 下会把 00:xx 给成 24
  const hour = value('hour') % 24;
  const asUtc = Date.UTC(value('year'), value('month') - 1, value('day'), hour, value('minute'), value('second'));
  return asUtc - Math.floor(at / 1000) * 1000;
}

/** 墙上时间换 ISO；形态不认、字段越界或时区不认识时返回 null，不猜 */
export function parseWallClock(raw: string, timeZone: string): string | null {
  const text = raw.trim();
  const matched = COMPACT.exec(text) ?? STAMP.exec(text);
  if (!matched) return null;
  const naive = Date.UTC(
    Number(matched[1]),
    Number(matched[2]) - 1,
    Number(matched[3]),
    Number(matched[4]),
    Number(matched[5]),
    Number(matched[6] ?? 0),
  );
  if (!Number.isFinite(naive)) return null;
  if (Number(matched[2]) < 1 || Number(matched[2]) > 12 || Number(matched[3]) < 1 || Number(matched[3]) > 31) return null;
  if (Number(matched[4]) > 23 || Number(matched[5]) > 59 || Number(matched[6] ?? 0) > 60) return null;

  try {
    const guess = naive - zoneOffsetMs(naive, timeZone);
    return new Date(naive - zoneOffsetMs(guess, timeZone)).toISOString();
  } catch {
    // Intl 不认的时区名会抛 RangeError
    return null;
  }
}

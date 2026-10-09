/** 网络地址与路径作用域的纯判定，后台校验与运行时拦截共用同一套口径 */

const IPV4_SEGMENTS = 4;
const IPV6_SEGMENTS = 8;
/** 一个字节一段掩码位，v4 共 32 位、v6 共 128 位 */
function toBytes(ip: string): number[] | null {
  const parts = ip.split('.');
  if (parts.length === IPV4_SEGMENTS && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)) {
    return parts.map((p) => Number(p));
  }
  if (!ip.includes(':')) return null;

  const [head, tail] = ip.split('::');
  if (ip.includes(':::')) return null;
  const parseGroups = (value: string): number[] | null => {
    if (!value) return [];
    const groups = value.split(':');
    if (!groups.every((g) => /^[0-9a-fA-F]{1,4}$/.test(g))) return null;
    return groups.map((g) => parseInt(g, 16));
  };

  if (tail === undefined) {
    const groups = parseGroups(head ?? '');
    if (!groups || groups.length !== IPV6_SEGMENTS) return null;
    return flattenGroups(groups);
  }
  const leading = parseGroups(head ?? '');
  const trailing = parseGroups(tail);
  if (!leading || !trailing) return null;
  const filled = IPV6_SEGMENTS - leading.length - trailing.length;
  if (filled < 0) return null;
  return flattenGroups([...leading, ...new Array(filled).fill(0), ...trailing]);
}

function flattenGroups(groups: number[]): number[] {
  const bytes: number[] = [];
  for (const group of groups) {
    bytes.push((group >> 8) & 0xff, group & 0xff);
  }
  return bytes;
}

/** 支持裸地址与 IPv4 / IPv6 的 CIDR 网段；非法输入一律判为不匹配，不让畸形配置变成放行后门 */
export function ipMatchesPattern(ip: string, pattern: string): boolean {
  const [network, prefixRaw] = pattern.trim().split('/');
  if (!network) return false;

  const target = toBytes(ip);
  const base = toBytes(network);
  if (!target || !base) return false;
  if (target.length !== base.length) return false;

  if (prefixRaw === undefined) return target.every((byte, i) => byte === base[i]);

  const prefix = Number(prefixRaw);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > base.length * 8) return false;

  for (let i = 0; i < base.length; i++) {
    const bitsHere = Math.min(8, Math.max(0, prefix - i * 8));
    if (bitsHere === 0) return true;
    if (bitsHere < 8) {
      const mask = (0xff << (8 - bitsHere)) & 0xff;
      return (target[i]! & mask) === (base[i]! & mask);
    }
    if (target[i] !== base[i]) return false;
  }
  return true;
}

export function ipInList(ip: string, list: readonly string[]): boolean {
  return list.some((pattern) => ipMatchesPattern(ip, pattern));
}

/** 来源只接受 `*` 或完整 origin（与 corsOriginSchema 同口径），不做子域通配 */
export function originAllowed(origin: string, patterns: readonly string[]): boolean {
  if (patterns.includes('*')) return true;
  const normalized = origin.trim().replace(/\/$/, '').toLowerCase();
  return patterns.some((pattern) => pattern.trim().replace(/\/$/, '').toLowerCase() === normalized);
}

/**
 * 规则作用域：global 命中所有；逗号分隔的多条路径任一命中；
 * 尾部 `/*` 按前缀匹配；其余按精确路径比较（不含 query）。
 */
export function scopeMatches(scope: string, path: string): boolean {
  const trimmed = scope.trim();
  if (!trimmed || trimmed === 'global') return true;
  return trimmed
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((entry) => {
      if (entry === 'global') return true;
      if (entry.endsWith('/*')) return path.startsWith(entry.slice(0, -1));
      if (entry.endsWith('*')) return path.startsWith(entry.slice(0, -1));
      return entry === path;
    });
}

/** 越具体的作用域越优先：精确路径 > 前缀 > 逗号列表 > global */
export function scopeSpecificity(scope: string): number {
  const entries = scope
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0 || entries.every((entry) => entry === 'global')) return 0;
  if (entries.some((entry) => entry.includes('*'))) return 1;
  return entries.length > 1 ? 1 : 2;
}

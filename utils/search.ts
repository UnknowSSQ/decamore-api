/**
 * 字段权重 name/en 6 > path 5 > kw 4 > cat 3 > desc 2，命中方式再乘系数：前缀 1.6 / 包含 1 / 子序列 0.35。
 * 任一 token 在所有字段都无匹配则整条 0 分排除；总分为各 token 最高分之和。
 */
import type { ApiCatalogItem } from '@/types';

const FIELD_WEIGHTS: readonly (readonly [key: keyof ApiCatalogItem, weight: number])[] = [
  ['name', 6],
  ['en', 6],
  ['path', 5],
  ['kw', 4],
  ['cat', 3],
  ['desc', 2],
] as const;

function tokenize(value: string): string[] {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/** needle 是否为 hay 的子序列，用于跳字匹配缩写，如 "hkt" → "hitokoto" */
function isSubsequence(hay: string, needle: string): boolean {
  if (!needle) return false;
  let i = 0;
  for (const ch of hay) {
    if (ch === needle[i]) i += 1;
    if (i === needle.length) return true;
  }
  return false;
}

/** 单条目的搜索得分；0 表示不匹配 */
function scoreApi(api: ApiCatalogItem, tokens: readonly string[]): number {
  if (tokens.length === 0) return 1; // 无关键词时全部命中，保持原序

  let total = 0;
  for (const token of tokens) {
    let best = 0;
    for (const [key, weight] of FIELD_WEIGHTS) {
      const field = String(api[key] ?? '')
        .normalize('NFKC')
        .toLowerCase();
      if (!field) continue;
      if (field.startsWith(token)) best = Math.max(best, weight * 1.6);
      else if (field.includes(token)) best = Math.max(best, weight);
      else if (isSubsequence(field, token)) best = Math.max(best, weight * 0.35);
    }
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

interface RankedApi {
  item: ApiCatalogItem;
  score: number;
}

/** 搜索与分类过滤是 AND 关系；同分时靠下面的微调项保持原序 */
export function rankCatalog(
  items: readonly ApiCatalogItem[],
  keyword: string,
  category?: string,
): RankedApi[] {
  const tokens = tokenize(keyword);
  const ranked: RankedApi[] = [];

  items.forEach((item, index) => {
    if (category && item.cat !== category) return;
    const score = scoreApi(item, tokens);
    if (score <= 0) return;
    ranked.push({ item, score: score + (items.length - index) * 0.001 });
  });

  return ranked.sort((a, b) => b.score - a.score);
}

/** 返回命中区间而非拼 HTML，由调用方自己包 <mark> */
export function matchRanges(text: string, keyword: string): [number, number][] {
  const tokens = tokenize(keyword);
  if (tokens.length === 0) return [];
  const lower = text.normalize('NFKC').toLowerCase();
  const ranges: [number, number][] = [];
  for (const token of tokens) {
    let from = lower.indexOf(token);
    while (from >= 0) {
      ranges.push([from, from + token.length]);
      from = lower.indexOf(token, from + token.length);
    }
  }
  return ranges;
}

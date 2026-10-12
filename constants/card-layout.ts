/** 后台设置页与首页/广场两处网格共用这一份默认值，否则两套跨度会让保存后的布局回跳 */
import type { CardSpan } from '@/types';

import { API_CATALOG, findApiById } from './api-catalog';

/** 首页与广场从 md 断点起都按 12 列排布 */
export const CARD_GRID_COLS = 12;

/** Zod 校验与跨度控件的选项都由这两个界生成 */
export const CARD_COLS_RANGE = { min: 1, max: CARD_GRID_COLS };
export const CARD_ROWS_RANGE = { min: 1, max: 4 };

/** 每行都占满 12 列；数组顺序即首页卡片顺序 */
export const DEFAULT_LIVE_CARD_LAYOUT: readonly CardSpan[] = [
  { id: 'hitokoto', cols: 7, rows: 1 },
  { id: 'wallpaper', cols: 5, rows: 1 },
  { id: 'answerbook', cols: 4, rows: 1 },
  { id: 'hotsearch', cols: 4, rows: 1 },
  { id: 'hotmusic', cols: 4, rows: 1 },
  { id: 'hotplay', cols: 6, rows: 1 },
  { id: 'hotchart', cols: 6, rows: 1 },
];

/** 12 ÷ 4 = 每行 3 张 */
export const PLAZA_CARD_DEFAULT_SPAN = { cols: 4, rows: 1 };

export const DEFAULT_PLAZA_CARD_LAYOUT: readonly CardSpan[] = API_CATALOG.map((item) => ({
  id: item.id,
  ...PLAZA_CARD_DEFAULT_SPAN,
}));

/** 目录缺失时回落到 id，占位格与编辑行都不会显示空白 */
export function cardName(id: string): string {
  return findApiById(id)?.name ?? id;
}

/** fallback 针对目录新增接口但设置里还没有对应条目的情况，否则会缩成 1 列 */
export function cardSpan(
  layout: readonly CardSpan[],
  id: string,
  fallback: { cols: number; rows: number },
): CardSpan {
  return layout.find((item) => item.id === id) ?? { id, cols: fallback.cols, rows: fallback.rows };
}

/**
 * 按布局的数组顺序重排卡片 id：布局里还没有的（后台新增的接口）按传入顺序接在后面，
 * 布局里已失效的 id（接口被删）直接丢掉——两边都对不上时宁可少几张，不显示空卡。
 */
export function layoutOrder(layout: readonly CardSpan[], ids: readonly string[]): string[] {
  const alive = new Set(ids);
  const listed = layout.map((span) => span.id).filter((id) => alive.has(id));
  const inLayout = new Set(listed);
  return [...listed, ...ids.filter((id) => !inLayout.has(id))];
}

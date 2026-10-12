/** 毒鸡汤语料读取；2,020 条里随机一条 */
import 'server-only';

import path from 'node:path';

import type { SoulLine } from '@/types';
import { createCorpusCache } from './corpus';

/** 上游带来的入库时间戳不外传：那两个时间是这份数据的，不是这句话的 */
interface SoulRow {
  id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

const corpus = createCorpusCache<SoulRow>({
  slot: '__decamoreSoul',
  file: path.join(process.cwd(), 'public', 'assets', 'json', 'soul.json'),
  emptyMessage: '毒鸡汤语料为空，请检查 public/assets/json/soul.json',
});

export async function randomSoulLine(): Promise<SoulLine> {
  const row = await corpus.pick();
  return { id: row.id, content: row.content };
}

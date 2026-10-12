/** 成语语料读取；5 万余条里随机取 N 条，可按字数筛 */
import 'server-only';

import path from 'node:path';

import type { IdiomList } from '@/types';
import { sampleUnique } from '@/utils/random';
import { createCorpusCache } from './corpus';

interface IdiomRow {
  cy: string;
}

const corpus = createCorpusCache<IdiomRow>({
  slot: '__decamoreChengYu',
  // 这个文件名是上游给的驼峰写法，跟 json 目录里其余文件不一致；要改小写得连磁盘文件一起改名
  file: path.join(process.cwd(), 'public', 'assets', 'json', 'ChengYu.json'),
  emptyMessage: '成语语料为空，请检查 public/assets/json/ChengYu.json',
});

/**
 * 本接口没有「全量」语义：整份语料 5 万余条、约 1.2MB，不是给浏览器用的形状，
 * 所以 limit 在这里有默认值 1（其余素材类接口的 limit 不传即全量）。
 * total 始终是语料全量条数，不随字数筛选变化——那是「一共收录多少」的意思。
 */
export async function randomIdioms(limit: number, chars?: number): Promise<IdiomList> {
  const rows = await corpus.load();
  const pool = chars ? rows.filter((row) => row.cy.length === chars) : rows;
  return { total: rows.length, items: sampleUnique(pool, limit).map((row) => row.cy) };
}

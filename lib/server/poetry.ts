/** 古诗词语料读取；300 首里随机一首，可按朝代筛 */
import 'server-only';

import path from 'node:path';

import type { Poem, PoemDynasty, PoemDynastyParam } from '@/types';
import { pickOne } from '@/utils/random';
import { createCorpusCache } from './corpus';

/** 语料行的上游字段名；number / volume / displayLines / originalEye 没有能对外的说法，不进契约 */
interface PoemRow {
  id: string;
  title: string;
  author: string;
  era: string;
  dynasty: PoemDynasty;
  genre: string;
  fullTextLines: string[];
  quote: string;
  answer: string;
  prompt: string;
  blankIndex: number;
  options: string[];
  meaning: string;
  realLife: string;
  tags: string[];
}

const corpus = createCorpusCache<PoemRow>({
  slot: '__decamorePoems',
  file: path.join(process.cwd(), 'public', 'assets', 'json', 'poems.json'),
  emptyMessage: '古诗词语料为空，请检查 public/assets/json/poems.json',
});

const DYNASTY_BY_PARAM: Record<PoemDynastyParam, PoemDynasty> = { tang: '唐', song: '宋' };

export async function randomPoem(dynasty?: PoemDynastyParam): Promise<Poem> {
  const rows = await corpus.load();
  const pool = dynasty ? rows.filter((row) => row.dynasty === DYNASTY_BY_PARAM[dynasty]) : rows;
  const row = pickOne(pool);

  return {
    id: row.id,
    title: row.title,
    author: row.author,
    dynasty: row.dynasty,
    era: row.era,
    genre: row.genre,
    lines: row.fullTextLines,
    quote: row.quote,
    meaning: row.meaning,
    realLife: row.realLife,
    tags: row.tags,
    blank: { prompt: row.prompt, options: row.options, answer: row.answer, index: row.blankIndex },
  };
}

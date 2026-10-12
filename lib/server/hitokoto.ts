/** 一言语料读取；并发首请求共享同一次读盘 */
import 'server-only';

import path from 'node:path';

import type { HitokotoLine } from '@/types';
import { createCorpusCache } from './corpus';

const corpus = createCorpusCache<HitokotoLine>({
  slot: '__decamoreHitokoto',
  file: path.join(process.cwd(), 'public', 'assets', 'json', 'hitokoto.json'),
  emptyMessage: '一言语料为空，请检查 public/assets/json/hitokoto.json',
});

export const randomHitokoto = corpus.pick;

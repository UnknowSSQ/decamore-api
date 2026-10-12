/** 答案之书语料读取；并发首请求共享同一次读盘 */
import 'server-only';

import path from 'node:path';

import type { AnswerBookEntry } from '@/types';
import { createCorpusCache } from './corpus';

const corpus = createCorpusCache<AnswerBookEntry>({
  slot: '__decamoreAnswerBook',
  file: path.join(process.cwd(), 'public', 'assets', 'json', 'answerbook.json'),
  emptyMessage: '答案之书语料为空，请检查 public/assets/json/answerbook.json',
});

export const randomAnswer = corpus.pick;

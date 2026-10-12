/** 疯狂星期四文案语料读取；424 条里随机一条 */
import 'server-only';

import path from 'node:path';

import type { KfcCopy } from '@/types';
import { createCorpusCache } from './corpus';

const corpus = createCorpusCache<string>({
  slot: '__decamoreKfc',
  file: path.join(process.cwd(), 'public', 'assets', 'json', 'kfc.json'),
  emptyMessage: '疯狂星期四文案语料为空，请检查 public/assets/json/kfc.json',
});

/** 语料是纯文本数组，没有可用编号：文件顺序变动即失效，所以不编 id 给调用方存库 */
export async function randomKfcCopy(): Promise<KfcCopy> {
  return { content: await corpus.pick() };
}

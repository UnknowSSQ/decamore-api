/** 答案之书语料读取；并发首请求共享同一次读盘 */
import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { AnswerBookEntry } from '@/types';

const CORPUS_FILE = path.join(process.cwd(), 'public', 'assets', 'json', 'answerbook.json');

let corpus: AnswerBookEntry[] | null = null;
let pending: Promise<AnswerBookEntry[]> | null = null;

export function loadCorpus(): Promise<AnswerBookEntry[]> {
  if (corpus) return Promise.resolve(corpus);

  pending ??= readFile(CORPUS_FILE, 'utf8')
    .then((raw) => JSON.parse(raw) as AnswerBookEntry[])
    .then((lines) => {
      if (lines.length === 0) throw new Error('答案之书语料为空，请检查 public/assets/json/answerbook.json');
      corpus = lines;
      return lines;
    })
    .finally(() => {
      // 失败时清空，下一次请求可以重新尝试读盘
      pending = null;
    });

  return pending;
}

export async function randomAnswer(): Promise<AnswerBookEntry> {
  const lines = await loadCorpus();
  return lines[Math.floor(Math.random() * lines.length)]!;
}

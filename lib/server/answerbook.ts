/** 答案之书语料读取；并发首请求共享同一次读盘 */
import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { AnswerBookEntry } from '@/types';

const CORPUS_FILE = path.join(process.cwd(), 'public', 'assets', 'json', 'answerbook.json');

/** 挂 globalThis：与 hitokoto 同理，语料按 chunk 复制会把同一份解析重复付 N 遍 */
const globalStore = globalThis as typeof globalThis & {
  __decamoreAnswerBookCorpus?: AnswerBookEntry[] | null;
  __decamoreAnswerBookPending?: Promise<AnswerBookEntry[]> | null;
};

export function loadCorpus(): Promise<AnswerBookEntry[]> {
  const cached = globalStore.__decamoreAnswerBookCorpus;
  if (cached) return Promise.resolve(cached);

  globalStore.__decamoreAnswerBookPending ??= readFile(CORPUS_FILE, 'utf8')
    .then((raw) => JSON.parse(raw) as AnswerBookEntry[])
    .then((lines) => {
      if (lines.length === 0) throw new Error('答案之书语料为空，请检查 public/assets/json/answerbook.json');
      globalStore.__decamoreAnswerBookCorpus = lines;
      return lines;
    })
    .finally(() => {
      // 失败时清空，下一次请求可以重新尝试读盘
      globalStore.__decamoreAnswerBookPending = null;
    });

  return globalStore.__decamoreAnswerBookPending;
}

export async function randomAnswer(): Promise<AnswerBookEntry> {
  const lines = await loadCorpus();
  return lines[Math.floor(Math.random() * lines.length)]!;
}

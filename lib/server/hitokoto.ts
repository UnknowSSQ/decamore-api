/** 一言语料读取；并发首请求共享同一次读盘 */
import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { HitokotoLine } from '@/types';

const CORPUS_FILE = path.join(process.cwd(), 'public', 'assets', 'json', 'hitokoto.json');

let corpus: HitokotoLine[] | null = null;
let pending: Promise<HitokotoLine[]> | null = null;

export function loadCorpus(): Promise<HitokotoLine[]> {
  if (corpus) return Promise.resolve(corpus);

  pending ??= readFile(CORPUS_FILE, 'utf8')
    .then((raw) => JSON.parse(raw) as HitokotoLine[])
    .then((lines) => {
      if (lines.length === 0) throw new Error('一言语料为空，请检查 public/assets/json/hitokoto.json');
      corpus = lines;
      return lines;
    })
    .finally(() => {
      // 失败时清空，下一次请求可以重新尝试读盘
      pending = null;
    });

  return pending;
}

export async function randomHitokoto(): Promise<HitokotoLine> {
  const lines = await loadCorpus();
  return lines[Math.floor(Math.random() * lines.length)]!;
}

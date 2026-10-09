/** 一言语料读取；并发首请求共享同一次读盘 */
import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { HitokotoLine } from '@/types';

const CORPUS_FILE = path.join(process.cwd(), 'public', 'assets', 'json', 'hitokoto.json');

/** 挂 globalThis：636KB 语料解析一次要 1ms 上下，每个 route chunk 各存一份就是白付 N 遍 */
const globalStore = globalThis as typeof globalThis & {
  __decamoreHitokotoCorpus?: HitokotoLine[] | null;
  __decamoreHitokotoPending?: Promise<HitokotoLine[]> | null;
};

export function loadCorpus(): Promise<HitokotoLine[]> {
  const cached = globalStore.__decamoreHitokotoCorpus;
  if (cached) return Promise.resolve(cached);

  globalStore.__decamoreHitokotoPending ??= readFile(CORPUS_FILE, 'utf8')
    .then((raw) => JSON.parse(raw) as HitokotoLine[])
    .then((lines) => {
      if (lines.length === 0) throw new Error('一言语料为空，请检查 public/assets/json/hitokoto.json');
      globalStore.__decamoreHitokotoCorpus = lines;
      return lines;
    })
    .finally(() => {
      // 失败时清空，下一次请求可以重新尝试读盘
      globalStore.__decamoreHitokotoPending = null;
    });

  return globalStore.__decamoreHitokotoPending;
}

export async function randomHitokoto(): Promise<HitokotoLine> {
  const lines = await loadCorpus();
  return lines[Math.floor(Math.random() * lines.length)]!;
}

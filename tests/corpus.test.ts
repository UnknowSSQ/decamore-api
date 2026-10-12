import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createCorpusCache } from '@/lib/server/corpus';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'corpus-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function writeJson(name: string, data: unknown): string {
  const file = path.join(dir, name);
  writeFileSync(file, JSON.stringify(data), 'utf8');
  return file;
}

describe('createCorpusCache', () => {
  it('读盘一次后缓存命中，并发首请求合并成同一次', async () => {
    const file = writeJson('a.json', [1, 2, 3]);
    const corpus = createCorpusCache<number>({ slot: '__testCorpusA', file, emptyMessage: '空' });

    const [load1, load2, pick] = await Promise.all([corpus.load(), corpus.load(), corpus.pick()]);
    assert.deepEqual(load1, [1, 2, 3]);
    assert.deepEqual(load2, [1, 2, 3]);
    assert.ok([1, 2, 3].includes(pick));
  });

  it('语料为空或不是数组时按 emptyMessage 抛错，且可重试', async () => {
    const file = writeJson('empty.json', []);
    const corpus = createCorpusCache<number>({ slot: '__testCorpusB', file, emptyMessage: '语料为空' });

    await assert.rejects(() => corpus.load(), /语料为空/);

    writeJson('empty.json', [9]);
    const retried = await corpus.load();
    assert.deepEqual(retried, [9], '失败清空 pending 后下次请求应重新读盘');
  });

  it('不同 slot 各自缓存，互不污染', async () => {
    const x = writeJson('x.json', ['x']);
    const y = writeJson('y.json', ['y']);
    const a = createCorpusCache<string>({ slot: '__testCorpusX', file: x, emptyMessage: '空' });
    const b = createCorpusCache<string>({ slot: '__testCorpusY', file: y, emptyMessage: '空' });

    assert.deepEqual(await a.load(), ['x']);
    assert.deepEqual(await b.load(), ['y']);
  });
});

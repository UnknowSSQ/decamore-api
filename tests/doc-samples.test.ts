/**
 * 文档样例必须能在语料里对上：手抄样例的代价是标点、取值和被截短的字段会漂，
 * 而这几篇的 data 段就是抄下来的真实响应（poetry 走字段映射，soulsoup 刻意不返回时间戳，都在这里验）。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { answerbookDoc } from '@/components/docs/apis/answerbook';
import { hitokotoDoc } from '@/components/docs/apis/hitokoto';
import { idiomsDoc } from '@/components/docs/apis/idioms';
import { kfcDoc } from '@/components/docs/apis/kfc';
import { poetryDoc } from '@/components/docs/apis/poetry';
import { soulsoupDoc } from '@/components/docs/apis/soulsoup';
import type { AuthoredApiDoc } from '@/components/docs/types';

function corpus<T>(file: string): T[] {
  return JSON.parse(readFileSync(path.join(process.cwd(), 'public', 'assets', 'json', file), 'utf8')) as T[];
}

/** 取成功窗里的 data（200 样例窗固定 value='ok'） */
function sampleData(doc: AuthoredApiDoc): Record<string, unknown> {
  const pane = doc.responsePanes.find((p) => p.value === 'ok');
  assert.ok(pane, '文档必须有 200 样例窗');
  return (JSON.parse(pane.code) as { data: Record<string, unknown> }).data;
}

interface PoemRow {
  id: string;
  title: string;
  author: string;
  era: string;
  dynasty: string;
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

describe('文档样例与语料一致', () => {
  it('一言的 200 样例是语料里逐字段相同的一条', () => {
    const data = sampleData(hitokotoDoc);
    const rows = corpus<HitokotoRow>('hitokoto.json');
    assert.ok(rows.some((row) => JSON.stringify(row) === JSON.stringify(data)), `样例在语料里不存在：${JSON.stringify(data)}`);
  });

  it('答案书的 200 样例是语料里逐字段相同的一条', () => {
    const data = sampleData(answerbookDoc);
    const rows = corpus<AnswerRow>('answerbook.json');
    assert.ok(rows.some((row) => JSON.stringify(row) === JSON.stringify(data)), `样例在语料里不存在：${JSON.stringify(data)}`);
  });

  it('古诗词的 200 样例与语料那一首逐字段对得上（含 blank 的改名映射）', () => {
    const data = sampleData(poetryDoc) as Record<string, unknown>;
    const row = corpus<PoemRow>('poems.json').find((item) => item.id === data.id);
    assert.ok(row, `样例里的 id ${String(data.id)} 不在语料中`);
    assert.equal(data.title, row.title);
    assert.equal(data.author, row.author);
    assert.equal(data.dynasty, row.dynasty);
    assert.equal(data.era, row.era);
    assert.equal(data.genre, row.genre);
    assert.deepEqual(data.lines, row.fullTextLines, 'lines 就是语料的 fullTextLines，一个字符都不能改');
    assert.equal(data.quote, row.quote);
    assert.equal(data.meaning, row.meaning);
    assert.equal(data.realLife, row.realLife);
    assert.deepEqual(data.tags, row.tags);

    const blank = data.blank as { prompt: string; options: string[]; answer: string; index: number };
    assert.equal(blank.prompt, row.prompt);
    assert.deepEqual(blank.options, row.options);
    assert.equal(blank.answer, row.answer);
    assert.equal(blank.index, row.blankIndex);
    // 契约承诺「index 那一格正是要挖空的字」，这条对全部 300 首都成立
    assert.equal([...blank.prompt][blank.index], blank.answer);
  });

  it('成语的 200 样例：每条都来自语料，total 是全量条数', () => {
    const data = sampleData(idiomsDoc) as { total: number; items: string[] };
    const rows = corpus<{ cy: string }>('ChengYu.json');
    assert.equal(data.total, rows.length, '文档样例里的 total 应当等于语料条数');
    for (const item of data.items) {
      assert.ok(rows.some((row) => row.cy === item), `样例成语「${item}」不在语料里`);
    }
  });

  it('毒鸡汤的 200 样例与语料同一条，且不回传上游时间戳', () => {
    const data = sampleData(soulsoupDoc) as { id: number; content: string };
    const row = corpus<{ id: number; content: string }>('soul.json').find((item) => item.id === data.id);
    assert.ok(row, `样例里的 id ${data.id} 不在语料中`);
    assert.equal(data.content, row.content);
    assert.deepEqual(Object.keys(data).sort(), ['content', 'id'], 'created_at / updated_at 不进契约');
  });

  it('疯狂星期四的 200 样例是语料里原样的一段', () => {
    const data = sampleData(kfcDoc) as { content: string };
    assert.ok(corpus<string>('kfc.json').includes(data.content), '样例文案不在语料里');
  });
});

interface HitokotoRow {
  content: string;
  creator: string;
  source: string;
}

interface AnswerRow {
  chinese: string;
  english: string;
}

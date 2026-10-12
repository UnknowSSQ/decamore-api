/**
 * 文档里写死的语料事实（条数、朝代配比、长度区间、字段不变量）必须由这份测试兜住：
 * 语料换版时这些数字会漂，漂了就该红，而不是让 /docs 继续讲昨天那个版本。
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

function corpus<T>(file: string): T[] {
  return JSON.parse(readFileSync(path.join(process.cwd(), 'public', 'assets', 'json', file), 'utf8')) as T[];
}

interface PoemRow {
  id: string;
  dynasty: string;
  era: string;
  genre: string;
  fullTextLines: string[];
  prompt: string;
  blankIndex: number;
  options: string[];
  answer: string;
}

interface SoulRow {
  id: number;
  content: string;
}

describe('古诗词语料事实（/docs/poetry 引用了这些数字）', () => {
  const rows = corpus<PoemRow>('poems.json');

  it('300 首，唐 150 / 宋 150，细分朝代四种', () => {
    assert.equal(rows.length, 300);
    const byDynasty = rows.reduce<Record<string, number>>((m, r) => ({ ...m, [r.dynasty]: (m[r.dynasty] ?? 0) + 1 }), {});
    assert.deepEqual(byDynasty, { 唐: 150, 宋: 150 });
    const eras = [...new Set(rows.map((r) => r.era))];
    assert.equal(eras.length, 4, `细分朝代应当只有四种，实际：${eras.join('、')}`);
    for (const era of ['唐', '南唐', '北宋', '南宋']) {
      assert.ok(eras.includes(era), `语料里没有「${era}」这一档，文档的取值说明要改`);
    }
  });

  it('id 是 p001–p300 且不重复', () => {
    assert.equal(new Set(rows.map((r) => r.id)).size, 300);
    assert.equal(rows[0]?.id, 'p001');
    assert.equal(rows[299]?.id, 'p300');
  });

  it('填空不变量：index 那一格就是 answer，选项固定 5 个、不重复且必含 answer', () => {
    for (const row of rows) {
      assert.equal([...row.prompt][row.blankIndex], row.answer, `${row.id} 的空位与答案不吻合`);
      assert.equal(row.options.length, 5, `${row.id} 的选项不是 5 个`);
      assert.equal(new Set(row.options).size, 5, `${row.id} 的选项有重复`);
      assert.ok(row.options.includes(row.answer), `${row.id} 的选项里没有正确答案`);
      assert.ok(row.blankIndex >= 0 && row.blankIndex <= 8, `${row.id} 的空位下标越出文档写的 0–8`);
    }
  });

  it('全文行数落在文档写的 2–60 行区间内', () => {
    const counts = rows.map((r) => r.fullTextLines.length);
    assert.equal(Math.min(...counts), 2);
    assert.equal(Math.max(...counts), 60);
  });

  /** 诗卡的「两句」取含题干的这一整行，不取 quote：quote 是本诗最有名的一联，有 25 首它跟题干不在同一联 */
  it('题干必落在某一整行内，且行内那一格就是答案（诗卡按整行连排呈现两句）', () => {
    for (const row of rows) {
      const line = row.fullTextLines.find((l) => l.includes(row.prompt));
      assert.ok(line, `${row.id} 的题干「${row.prompt}」不在任何一行里，诗卡取不到两句`);
      // 卡片用 indexOf + slice 定位空位，遇到代理对会错位，这里当场钉住取值范围
      assert.equal([...line].length, line.length, `${row.id} 的行里有非 BMP 字符，下标切片会错位`);
      assert.equal(line[line.indexOf(row.prompt) + row.blankIndex], row.answer, `${row.id} 的行内空位与答案不吻合`);
    }
  });

  it('genre 是 82 种', () => {
    assert.equal(new Set(rows.map((r) => r.genre)).size, 82);
  });
});

describe('成语语料事实（/docs/idioms 引用了这些数字）', () => {
  const rows = corpus<{ cy: string }>('ChengYu.json');

  it('50,373 条、无重复、每条只有一个 cy 字段', () => {
    assert.equal(rows.length, 50_373);
    assert.equal(new Set(rows.map((r) => r.cy)).size, rows.length);
    assert.ok(rows.every((row) => Object.keys(row).length === 1 && typeof row.cy === 'string'));
  });

  it('字数只有 4–8，且文档写的各档条数没变', () => {
    const byLength = rows.reduce<Record<number, number>>((m, r) => ({ ...m, [r.cy.length]: (m[r.cy.length] ?? 0) + 1 }), {});
    assert.deepEqual(Object.keys(byLength).map(Number).sort(), [4, 5, 6, 7, 8]);
    assert.equal(byLength[4], 47_246);
    assert.equal(byLength[5], 1_178);
    assert.equal(byLength[6], 601);
    assert.equal(byLength[7], 864);
    assert.equal(byLength[8], 484);
  });
});

describe('毒鸡汤语料事实（/docs/soulsoup 引用了这些数字）', () => {
  const rows = corpus<SoulRow>('soul.json');

  it('2,020 条，id 从 1 起连续且不重复', () => {
    assert.equal(rows.length, 2_020);
    assert.equal(new Set(rows.map((r) => r.id)).size, rows.length);
    assert.equal(Math.min(...rows.map((r) => r.id)), 1);
    assert.equal(Math.max(...rows.map((r) => r.id)), 2_020);
  });

  it('正文长度在文档写的 3–112 字之间', () => {
    const lengths = rows.map((r) => r.content.length);
    assert.equal(Math.min(...lengths), 3);
    assert.equal(Math.max(...lengths), 112);
  });
});

describe('疯狂星期四语料事实（/docs/kfc 引用了这些数字）', () => {
  const rows = corpus<string>('kfc.json');

  it('424 段纯文本、无空串、长度 19–988 字', () => {
    assert.equal(rows.length, 424);
    assert.ok(rows.every((row) => typeof row === 'string' && row.trim().length > 0));
    const lengths = rows.map((row) => row.length);
    assert.equal(Math.min(...lengths), 19);
    assert.equal(Math.max(...lengths), 988);
  });

  it('语料没有可外传的编号：文档因此不给 id 字段', () => {
    assert.equal(typeof rows[0], 'string', '语料一旦换成带 id 的对象，/docs/kfc 那句「响应里没有 id」就要跟着改');
  });
});

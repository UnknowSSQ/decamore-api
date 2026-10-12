import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pickOne, sampleUnique } from '@/utils/random';

const SOURCE = Array.from({ length: 200 }, (_, i) => i);

describe('sampleUnique（不放回随机取样）', () => {
  it('条数与去重：抽多少给多少，且不出现同一条', () => {
    for (let round = 0; round < 50; round++) {
      const picked = sampleUnique(SOURCE, 12);
      assert.equal(picked.length, 12);
      assert.equal(new Set(picked).size, 12, '同一次抽取里不该有重复元素');
      picked.forEach((value) => assert.ok(SOURCE.includes(value)));
    }
  });

  it('count 超过总数时给全部，仍不重复', () => {
    const picked = sampleUnique([1, 2, 3], 10);
    assert.equal(picked.length, 3);
    assert.equal(new Set(picked).size, 3);
  });

  it('每个位置都有机会被抽到（稀疏交换表没有把尾部锁死）', () => {
    const seen = new Set<number>();
    for (let round = 0; round < 400; round++) sampleUnique(SOURCE, 3).forEach((value) => seen.add(value));
    assert.ok(seen.size > 100, `400 轮只抽 3 条却几乎没见过几个元素：${seen.size}`);
  });

  it('空数组与 count 0 都不炸', () => {
    assert.deepEqual(sampleUnique([], 5), []);
    assert.deepEqual(sampleUnique(SOURCE, 0), []);
  });
});

describe('pickOne', () => {
  it('返回的元素一定来自入参', () => {
    for (let round = 0; round < 100; round++) {
      assert.ok(SOURCE.includes(pickOne(SOURCE)));
    }
  });
});

import './setup';
import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { createBoardCache } from '@/lib/server/board-cache';

/** 每个用例占一个独立槽位：缓存挂在 globalThis 上，共用槽位会互相看见 */
let slotSeq = 0;
const nextSlot = () => `__testBoardCache${(slotSeq += 1)}`;

const clock = { now: 1_000 };
const realNow = Date.now;

interface Board {
  items: string[];
}

beforeEach(() => {
  Date.now = () => clock.now;
  clock.now = 1_000;
});

afterEach(() => {
  Date.now = realNow;
});

function make(ttlMs: number, fetch?: (key: string) => Promise<Board>) {
  const calls: string[] = [];
  const resolve = createBoardCache<string, Board, { key: string; items: string[]; cached: boolean }>({
    slot: nextSlot(),
    ttlMs,
    fetch: async (key) => {
      calls.push(key);
      return fetch ? await fetch(key) : { items: [key] };
    },
    toResult: (key, entry, cached) => ({ key, items: entry.items, cached }),
  });
  return { resolve, calls };
}

describe('createBoardCache', () => {
  it('首次走上游并标 cached=false，TTL 内第二次命中缓存', async () => {
    const { resolve, calls } = make(60_000);

    const first = await resolve('weibo');
    clock.now += 1;
    const second = await resolve('weibo');

    assert.deepEqual(calls, ['weibo'], 'TTL 内不该再取上游');
    assert.equal(first.cached, false);
    assert.equal(second.cached, true);
    assert.deepEqual(second.items, ['weibo']);
  });

  it('过期后重新取', async () => {
    const { resolve, calls } = make(1_000);

    await resolve('qq');
    clock.now += 1_001;
    await resolve('qq');

    assert.deepEqual(calls, ['qq', 'qq']);
  });

  it('同键并发合并成一次上游，不同键各取一次', async () => {
    const { resolve, calls } = make(60_000);

    const [a, b, c] = await Promise.all([resolve('a'), resolve('a'), resolve('b')]);

    assert.deepEqual(calls, ['a', 'b']);
    assert.equal(a.cached, false);
    assert.equal(b.cached, false, '合并到同一个请求，两份都算上游结果');
    assert.equal(c.cached, false);
  });

  it('上游抛错不写缓存、不留下进行中的请求，下次会重试', async () => {
    let attempt = 0;
    const { resolve } = make(60_000, async () => {
      attempt += 1;
      if (attempt === 1) throw new Error('上游超时');
      return { items: ['ok'] };
    });

    await assert.rejects(() => resolve('x'), /上游超时/);
    const retried = await resolve('x');

    assert.equal(attempt, 2, '失败的那次不该被并发请求共享成永久错误');
    assert.deepEqual(retried.items, ['ok']);
    assert.equal(retried.cached, false);
  });

  it('缓存的是上游裸数据，截断留给调用方', async () => {
    const { resolve } = make(60_000, async () => ({ items: ['1', '2', '3', '4'] }));

    const full = await resolve('board');
    assert.deepEqual(full.items, ['1', '2', '3', '4']);
    assert.equal(full.items.length, 4);
  });
});

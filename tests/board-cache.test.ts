import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { createBoardCache } from '@/lib/server/board-cache';

/** 每个用例占一个独立槽位：缓存挂在 globalThis 上，共用槽位会互相看见 */
let slotSeq = 0;
const nextSlot = () => `__testBoardCache${(slotSeq += 1)}`;

const clock = { now: 1_000 };
const realNow = Date.now;

/**
 * 后台刷新是「发起即返回」的，失败时刻要等几层微任务才落账；
 * 假时钟下只 await 一个微任务会读到未更新的内部状态，这里排空到宏任务。
 */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 3; i += 1) await new Promise((resolve) => setImmediate(resolve));
};

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

  it('过期但在兜底窗口内：先回旧数据，后台刷新一次', async () => {
    let version = 1;
    const { resolve, calls } = make(1_000, async (key) => ({ items: [`${key}#${version}`] }));

    const first = await resolve('hot');
    version = 2;
    clock.now += 1_001;
    const stale = await resolve('hot');
    await flush();

    assert.equal(first.cached, false);
    assert.equal(stale.cached, true, '兜底窗口里的旧数据仍算命中缓存');
    assert.deepEqual(stale.items, ['hot#1'], '这一答用的是旧数据，不等上游');
    assert.deepEqual(calls, ['hot', 'hot'], '但后台确实去刷了一次');
    assert.equal((await resolve('hot')).items[0], 'hot#2', '刷新完成后下一次就是新数据');
  });

  it('后台刷新失败：继续服务旧数据，且退避期内不再撞上游', async () => {
    let attempt = 0;
    // TTL 取 20 秒：兜底窗口是 TTL + 十分钟宽限，容得下 15 秒退避，才测得出「退避后重试」而不是「超出窗口」
    const { resolve, calls } = make(20_000, async (key) => {
      attempt += 1;
      if (attempt > 1) throw new Error('上游超时');
      return { items: [key] };
    });

    await resolve('weibo');
    clock.now += 20_001;
    const stale = await resolve('weibo');
    await flush();

    assert.deepEqual(stale.items, ['weibo']);
    assert.equal(stale.cached, true);
    assert.deepEqual(calls, ['weibo', 'weibo'], '过期时后台该试一次');

    // 失败后 15 秒的退避期内不再撞上游，但仍然答得出来
    clock.now += 5_000;
    const during = await resolve('weibo');
    await flush();
    assert.deepEqual(during.items, ['weibo']);
    assert.deepEqual(calls, ['weibo', 'weibo'], '失败后 15 秒内不该再起刷新');

    clock.now += 20_000;
    await resolve('weibo');
    await flush();
    assert.equal(calls.length, 3, '过了退避期就该再试一次');
  });

  it('旧到超出兜底窗口就不再当真：回到阻塞取数', async () => {
    let version = 1;
    const { resolve } = make(1_000, async (key) => ({ items: [`${key}#${version}`] }));

    await resolve('old');
    version = 2;
    // 1,000 + max(1,000, 十分钟) = 601,000，再往前一毫秒就当没有缓存
    clock.now += 601_001;
    const fresh = await resolve('old');

    assert.equal(fresh.cached, false);
    assert.deepEqual(fresh.items, ['old#2']);
  });

  it('长 TTL 只宽限一个周期，不按倍数跑', async () => {
    let version = 1;
    const { resolve, calls } = make(3_600_000, async (key) => ({ items: [`${key}#${version}`] }));

    await resolve('rates');
    version = 2;
    clock.now += 3_600_001;
    const stale = await resolve('rates');
    await flush();

    assert.deepEqual(stale.items, ['rates#1'], '过期一毫秒，还在一个 TTL 的宽限内');
    assert.equal(stale.cached, true);
    assert.deepEqual(calls, ['rates', 'rates'], '后台去刷一次');

    version = 3;
    // 后台那份刷成功后 at 已重置，从那时起再过一个 TTL 就超出宽限
    clock.now += 7_200_001;
    const blocking = await resolve('rates');
    assert.equal(blocking.cached, false, '超出宽限就当没有缓存，这一枪去等上游');
    assert.deepEqual(blocking.items, ['rates#3']);
  });

  it('键数封顶：超出后淘汰最久没刷新的那个', async () => {
    const { resolve, calls } = make(60_000);

    for (let i = 0; i < 65; i += 1) await resolve(`k${i}`);
    assert.equal(calls.length, 65);

    // 第 1 个键已经被挤出去，再问会重新取；最后一个仍在缓存里
    await resolve('k0');
    assert.equal(calls.length, 66, '超上限的最老键该被淘汰');
    await resolve('k64');
    assert.equal(calls.length, 66, '还在上限内的键不该重取');
  });
});

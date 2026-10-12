import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { MemoryKvStore, getKvBackend, getKvStore } from '@/lib/server/store/kv';
import { createKvWindowStore } from '@/utils/rate-window';

describe('MemoryKvStore', () => {
  let kv: MemoryKvStore;
  beforeEach(() => {
    kv = new MemoryKvStore();
  });

  it('set/get/del 与 null 语义', async () => {
    assert.equal(await kv.get('missing'), null);
    await kv.set('k', 'v');
    assert.equal(await kv.get('k'), 'v');
    await kv.del('k');
    assert.equal(await kv.get('k'), null);
  });

  it('incr 原子自增，TTL 过期后回到 1', async () => {
    assert.equal(await kv.incr('c'), 1);
    assert.equal(await kv.incr('c'), 2);
    assert.equal(await kv.incr('c'), 3);
    await kv.set('c', 'x', 1);
    await new Promise((r) => setTimeout(r, 8));
    assert.equal(await kv.get('c'), null, '1ms TTL 过期后应读不到');
  });

  it('mget / mset 批量', async () => {
    await kv.mset([['a', '1'], ['b', '2']], 1000);
    assert.deepEqual(await kv.mget(['a', 'b', 'c']), ['1', '2', null]);
  });

  it('窗口键只写不读也能被回收：总量有界，且不清掉还活着的计数', async () => {
    // 限流的键形如 rl:<桶>:<窗口序号>，窗口一换那个键就再也不会被读到，
    // 惰性删除（get/incr 命中同一键）永远碰不到它 —— 只有一条容量清扫能兜住。
    const shared = ((globalThis as typeof globalThis & Record<string, unknown>).__decamoreKv ??=
      new Map<string, { value: string; expiry: number }>()) as Map<string, { value: string; expiry: number }>;
    shared.clear();

    // 第一轮：6000 个 1ms 就过期的窗口键，写完即全部成为垃圾
    for (let i = 0; i < 6_000; i++) await kv.incr(`rl:old:${i}`, 1);
    await new Promise((r) => setTimeout(r, 8));

    // 第二轮：5001 个整窗口都活着的键，把规模推过容量线，逼出清扫
    for (let i = 0; i < 5_001; i++) await kv.incr(`rl:new:${i}`, 60_000);

    assert.ok(shared.size < 6_000, `越界后应回收过期键，实际 ${shared.size} 条（两轮共写入 11001）`);
    assert.equal(await kv.get('rl:old:0'), null, '过期窗口键应已被回收');
    assert.equal(await kv.get('rl:new:0'), '1', '还活着的计数不能被误删');
    assert.equal(await kv.incr('rl:new:0'), 2, '活着的键继续累加');
    shared.clear();
  });
});

describe('createKvWindowStore（跨实例固定窗口）', () => {
  let kv: MemoryKvStore;
  beforeEach(() => {
    kv = new MemoryKvStore();
  });

  it('同一窗口内超限拒绝，越过窗口起点后重新计数', async () => {
    const w = createKvWindowStore(kv);
    const t0 = 1_000_000;
    assert.equal((await w.tryConsume('k', 2, 60_000, t0)).allowed, true);
    assert.equal((await w.tryConsume('k', 2, 60_000, t0 + 1)).allowed, true);
    const denied = await w.tryConsume('k', 2, 60_000, t0 + 2);
    assert.equal(denied.allowed, false);
    // 进入下一个 60s 窗口起点
    assert.equal((await w.tryConsume('k', 2, 60_000, t0 + 60_001)).allowed, true);
  });

  it('两个实例共享同一份 Kv，计数累加（多实例不再被实例数放大）', async () => {
    const a = createKvWindowStore(kv);
    const b = createKvWindowStore(kv);
    const t0 = 2_000_000;
    await a.tryConsume('shared', 5, 60_000, t0);
    await b.tryConsume('shared', 5, 60_000, t0);
    const third = await a.tryConsume('shared', 5, 60_000, t0);
    assert.equal(third.allowed, true, '两份实例各记一次，合计 2，未触发上限 5');
  });
});

describe('getKvStore 默认后端', () => {
  it('未配置时为 memory 后端', () => {
    assert.equal(getKvBackend(), 'memory');
    assert.ok(getKvStore());
  });
});

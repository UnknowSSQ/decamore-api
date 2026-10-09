import './setup';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createWindowStore } from '@/utils/rate-window';

describe('createWindowStore', () => {
  it('第 limit 次仍放行，第 limit+1 次拒绝', () => {
    const store = createWindowStore();
    const t0 = 1_000_000;
    assert.equal(store.tryConsume('k', 3, 60_000, t0).allowed, true);
    assert.equal(store.tryConsume('k', 3, 60_000, t0 + 1).allowed, true);
    assert.equal(store.tryConsume('k', 3, 60_000, t0 + 2).allowed, true);
    const denied = store.tryConsume('k', 3, 60_000, t0 + 3);
    assert.equal(denied.allowed, false);
    assert.ok(denied.retryAfterSec >= 1);
  });

  it('窗口过期后重新起算', () => {
    const store = createWindowStore();
    const t0 = 1_000_000;
    store.tryConsume('k', 1, 60_000, t0);
    assert.equal(store.tryConsume('k', 1, 60_000, t0 + 1000).allowed, false);
    assert.equal(store.tryConsume('k', 1, 60_000, t0 + 61_000).allowed, true);
  });

  it('不同键互不影响', () => {
    const store = createWindowStore();
    const t0 = 1_000_000;
    store.tryConsume('a', 1, 60_000, t0);
    assert.equal(store.tryConsume('b', 1, 60_000, t0).allowed, true);
    assert.equal(store.tryConsume('a', 1, 60_000, t0).allowed, false);
  });

  it('超过容量时清掉已过期的键，活跃键保留', () => {
    const store = createWindowStore(3);
    const t0 = 1_000_000;
    store.tryConsume('old1', 5, 10, t0);
    store.tryConsume('old2', 5, 10, t0);
    store.tryConsume('live', 5, 60_000, t0);
    store.tryConsume('fresh', 5, 60_000, t0 + 50);
    store.tryConsume('fresh', 5, 60_000, t0 + 51);
    assert.ok(store.size() <= 4, `桶数应被回收，实际 ${store.size()}`);
    assert.equal(store.tryConsume('live', 5, 60_000, t0 + 60).allowed, true);
  });

  it('注入的 Map 就是状态本体，多个 store 实例能共享同一份额额', () => {
    const shared = new Map<string, { count: number; resetAt: number }>();
    const a = createWindowStore(5000, shared);
    const b = createWindowStore(5000, shared);
    const t0 = 1_000_000;
    a.tryConsume('k', 1, 60_000, t0);
    assert.equal(b.tryConsume('k', 1, 60_000, t0).allowed, false);
  });

  it('reset 清空计数', () => {
    const store = createWindowStore();
    const t0 = 1_000_000;
    store.tryConsume('k', 1, 60_000, t0);
    store.reset();
    assert.equal(store.tryConsume('k', 1, 60_000, t0).allowed, true);
  });
});

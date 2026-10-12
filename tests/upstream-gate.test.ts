/**
 * 上游并发闸的行为：闸满时排队、名额直接交接、等不到就抛且不占名额、每个主机一道闸。
 * 每个用例用自己的主机名——闸表挂 globalThis，共用一个名字会互相污染。
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  UPSTREAM_MAX_PARALLEL,
  UPSTREAM_QUEUE_WAIT_MS,
  acquireUpstreamSlot,
} from '@/utils/upstream-gate';

const tick = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function fill(host: string): Promise<Array<() => void>> {
  const releases: Array<() => void> = [];
  for (let i = 0; i < UPSTREAM_MAX_PARALLEL; i += 1) releases.push(await acquireUpstreamSlot(host));
  return releases;
}

describe('上游并发闸', () => {
  it('闸满时后来的排队，不立刻失败', async () => {
    const host = 'gate-queue.test';
    const releases = await fill(host);

    let settled = false;
    void acquireUpstreamSlot(host).then((release) => {
      settled = true;
      release();
    });
    await tick(20);
    assert.equal(settled, false, '第 7 个应该还在排队');

    releases[0]!();
    await tick(20);
    assert.equal(settled, true, '释放一个就该把名额交接给排队者');
    for (const release of releases.slice(1)) release();
  });

  it('等不到名额就抛，且一个名额都不占', async () => {
    const host = 'gate-timeout.test';
    const releases = await fill(host);

    const started = Date.now();
    await assert.rejects(() => acquireUpstreamSlot(host), /上游并发已满/);
    const waited = Date.now() - started;
    assert.ok(waited >= UPSTREAM_QUEUE_WAIT_MS - 50, `没有等满 1 秒（实际 ${waited}ms）`);
    assert.ok(waited < UPSTREAM_QUEUE_WAIT_MS + 400, `等太久了（实际 ${waited}ms）`);

    // 排队者失败退出后不能留残位：把闸全放开，还能重新拿满一轮
    for (const release of releases) release();
    const again = await fill(host);
    assert.equal(again.length, UPSTREAM_MAX_PARALLEL);
    for (const release of again) release();
  });

  it('每个主机各一道闸', async () => {
    const busy = 'gate-busy.test';
    const free = 'gate-free.test';
    const releases = await fill(busy);

    const started = Date.now();
    const other = await acquireUpstreamSlot(free);
    assert.ok(Date.now() - started < 50, '别的主机不该被这道闸拖住');

    other();
    for (const release of releases) release();
  });
});

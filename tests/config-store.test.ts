import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createKvBackedConfig, replaceInPlace } from '@/lib/server/store/config';

interface Shape {
  keep: string;
  stale?: number;
  list: string[];
}

describe('replaceInPlace（配置水合的原地替换）', () => {
  it('对象：引用不换、新值进来、next 里没有的键被删掉', () => {
    const target: Shape = { keep: 'old', stale: 1, list: ['a'] };
    const reference = target;
    replaceInPlace(target, { keep: 'new', list: ['b', 'c'] });

    assert.equal(target, reference, '必须原地改：换引用就只有当前 chunk 看得见');
    assert.equal(target.keep, 'new');
    assert.equal(target.stale, undefined, '外部数据里没有的键不该留在内存里');
    assert.deepEqual(target.list, ['b', 'c']);
  });

  it('数组：引用不换、整段内容替换', () => {
    const target: number[] = [1, 2, 3];
    const reference = target;
    replaceInPlace(target, [9]);

    assert.equal(target, reference);
    assert.deepEqual(target, [9]);
  });
});

describe('createKvBackedConfig（globalThis 单例 + 种子版本）', () => {
  const seed = (): Shape => ({ keep: 'seed', stale: 1, list: ['x'] });

  it('同一版本被第二个调用方拿到的是同一个引用（模拟两个 route chunk）', () => {
    const a = createKvBackedConfig<Shape>({ slot: 'TestShared', key: 'decamore:test-shared', seedVersion: 'v1', seed, accepts: (v): v is Shape => Boolean(v) });
    const b = createKvBackedConfig<Shape>({ slot: 'TestShared', key: 'decamore:test-shared', seedVersion: 'v1', seed, accepts: (v): v is Shape => Boolean(v) });

    assert.equal(a.value, b.value, 'a 写入后 b 必须看得见，这是这套约定存在的原因');
    a.value.keep = 'written';
    assert.equal(b.value.keep, 'written');
  });

  it('bump 种子版本会重新播种并触发 onReseed', () => {
    let reseeded = 0;
    const options = { slot: 'TestReseed', key: 'decamore:test-reseed', seed, accepts: (v: unknown): v is Shape => Boolean(v), onReseed: () => { reseeded += 1; } };

    const first = createKvBackedConfig<Shape>({ ...options, seedVersion: 'v1' });
    first.value.keep = 'edited';
    const second = createKvBackedConfig<Shape>({ ...options, seedVersion: 'v2' });

    assert.equal(second.value.keep, 'seed', '改了默认值不 bump 就看不到，bump 了就该看到');
    assert.notEqual(second.value, first.value);
    assert.equal(reseeded, 2, '两次播种各清一次运行时计数');
  });

  it('memory 后端下 mirror() 是空操作，不抛错', () => {
    const store = createKvBackedConfig<Shape>({ slot: 'TestMirror', key: 'decamore:test-mirror', seedVersion: 'v1', seed, accepts: (v): v is Shape => Boolean(v) });
    assert.doesNotThrow(() => store.mirror());
  });
});

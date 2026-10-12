import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_PLAZA_CARD_LAYOUT, cardSpan, layoutOrder } from '@/constants/card-layout';
import type { CardSpan } from '@/types';

const LAYOUT: CardSpan[] = [
  { id: 'warning', cols: 6, rows: 1 },
  { id: 'hitokoto', cols: 4, rows: 2 },
  { id: 'gold', cols: 4, rows: 1 },
];

describe('layoutOrder', () => {
  it('布局的数组顺序就是渲染顺序，与车单原序无关', () => {
    assert.deepEqual(layoutOrder(LAYOUT, ['hitokoto', 'gold', 'warning']), ['warning', 'hitokoto', 'gold']);
  });

  it('车单新增的接口接在末尾，不会因为布局里没写过就消失', () => {
    assert.deepEqual(layoutOrder(LAYOUT, ['hitokoto', 'gold', 'warning', 'stock']), [
      'warning',
      'hitokoto',
      'gold',
      'stock',
    ]);
  });

  it('布局里失效的 id 直接丢掉，不渲染空卡', () => {
    assert.deepEqual(layoutOrder([...LAYOUT, { id: 'removed-api', cols: 4, rows: 1 }], ['gold']), ['gold']);
  });

  it('缺失跨度的新接口落回默认占位，而不是缩成一列', () => {
    const span = cardSpan(LAYOUT, 'stock', { cols: 4, rows: 1 });
    assert.deepEqual(span, { id: 'stock', cols: 4, rows: 1 });
  });

  it('默认广场布局覆盖车单全集，顺序与车单一致', () => {
    const defaults = DEFAULT_PLAZA_CARD_LAYOUT.map((span) => span.id);
    assert.deepEqual(layoutOrder(DEFAULT_PLAZA_CARD_LAYOUT, defaults), defaults);
    assert.ok(defaults.length >= 21, `廿一篇文档对应的接口都该在默认布局里，实际 ${defaults.length}`);
  });
});

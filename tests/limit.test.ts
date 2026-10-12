import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AVATAR_TYPES } from '@/lib/zod/public.schema';
import { avatarQuerySchema, hotsearchQuerySchema } from '@/lib/zod/public.schema';
import { listAssets } from '@/lib/server/static-assets';

describe('公开接口的 limit 出参', () => {
  it('不传 limit 时保持全量，不静默改变既有调用方的结果', async () => {
    const full = await listAssets('avatar', 'boy', AVATAR_TYPES);
    assert.equal(full.items.length, full.total, '不传 limit 应当拿到全量');
    assert.ok(full.total > 6, '目录太小测不出截断');
  });

  it('limit 截 items 但 total 仍是全量', async () => {
    const full = await listAssets('avatar', 'boy', AVATAR_TYPES);
    const some = await listAssets('avatar', 'boy', AVATAR_TYPES, 3);
    assert.equal(some.items.length, 3);
    assert.equal(some.total, full.total);
    const pool = new Set(full.items.map((item) => item.id));
    for (const item of some.items) assert.ok(pool.has(item.id), `${item.id} 不在目录里`);
  });

  it('limit 的入参校验：空串等价不传，越界与非法值 422', () => {
    assert.equal(hotsearchQuerySchema.parse({ limit: '5' }).limit, 5);
    assert.equal(hotsearchQuerySchema.parse({ limit: '' }).limit, undefined);
    assert.equal(hotsearchQuerySchema.parse({}).limit, undefined);
    assert.equal(avatarQuerySchema.parse({ limit: '6' }).type, 'boy', '加了 limit 不能动掉 type 的默认值');
    assert.ok(!hotsearchQuerySchema.safeParse({ limit: '0' }).success);
    assert.ok(!hotsearchQuerySchema.safeParse({ limit: '101' }).success);
    assert.ok(!hotsearchQuerySchema.safeParse({ limit: 'abc' }).success);
  });
});

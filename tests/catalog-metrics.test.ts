import './setup';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { NextRequest } from 'next/server';

import { listManagedApis } from '@/lib/server/catalog';
import { routeCallStats } from '@/lib/server/stats';
import { GET as hitokoto } from '@/app/api/v1/hitokoto/route';

describe('接口管理的指标来源', () => {
  it('种子值与公开文档口径一致：免鉴权、受频控、状态在线', () => {
    for (const api of listManagedApis()) {
      assert.equal(api.authRequired, false, `${api.id} 公开接口应当免鉴权`);
      assert.equal(api.rateLimited, true, `${api.id} 应声明受频控`);
      assert.equal(api.status, 'online', `${api.id} 不该被种子成降级`);
    }
  });

  it('指标是调用缓冲的真实计数，调用之后才出现', async () => {
    const before = listManagedApis().find((a) => a.id === 'hitokoto');
    assert.ok(before);

    await hitokoto(new NextRequest('http://localhost:3000/api/v1/hitokoto'), {
      params: Promise.resolve({}),
    });

    const stat = routeCallStats()['/api/v1/hitokoto'];
    assert.ok(stat, '调用应进路由汇总');
    assert.ok(stat.count >= 1);

    const after = listManagedApis().find((a) => a.id === 'hitokoto');
    assert.ok(after);
    assert.ok(after.calls24h >= stat.count, '列表数字应跟着真实计数走');
    assert.ok(after.avgLatencyMs >= 0);
  });
});

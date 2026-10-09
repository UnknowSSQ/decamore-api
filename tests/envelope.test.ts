import './setup';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { z } from 'zod';
import { NextRequest } from 'next/server';

import { ok, withApiHandler } from '@/lib/server';
import { GET as hitokoto, OPTIONS as hitokotoOptions } from '@/app/api/v1/hitokoto/route';

type Handler = (request: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

const run = (handler: Handler, path: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  handler(new NextRequest(`http://localhost:3000${path}`, init), { params: Promise.resolve({}) });

describe('公开接口单层信封', () => {
  it('成功响应有 requestId / serverTime / site，且没有 success 位', async () => {
    const res = await run(hitokoto, '/api/v1/hitokoto');
    assert.equal(res.status, 200);

    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.statusCode, 200);
    assert.equal(body.message, 'success');
    assert.ok(body.data && typeof body.data === 'object');
    assert.equal('success' in body, false, '公开信封不应带 success');

    const meta = body.meta as Record<string, unknown>;
    assert.ok(meta.requestId);
    assert.ok(Date.parse(String(meta.serverTime)) > 0);
    assert.equal(typeof meta.site, 'string');
    assert.equal(meta.requestId, res.headers.get('x-trace-id'));
  });

  it('公开接口的失败响应改用控制台信封（两套结构是刻意的）', async () => {
    const failing = withApiHandler(() => {
      throw new z.ZodError([
        { code: 'custom', message: 'platform 不支持', path: ['platform'] },
      ]);
    }, { auth: false, route: '/api/v1/demo', query: z.object({ platform: z.string() }) });

    const res = await run(failing, '/api/v1/demo?platform=x');
    assert.equal(res.status, 422);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.success, false);
    assert.equal(body.statusCode, 422);
    assert.equal(body.data, null);
    const meta = body.meta as Record<string, unknown>;
    assert.equal(typeof meta.timestamp, 'number');
    assert.ok(Array.isArray(body.issues));
    assert.equal((body.issues as { field: string }[])[0]?.field, 'platform');
  });

  it('控制台成功信封带 success 与 traceId', async () => {
    const handler = withApiHandler(() => ok({ ping: true }), { auth: false, route: '/api/v1/demo' });
    const body = (await (await run(handler, '/api/v1/demo')).json()) as Record<string, unknown>;
    assert.equal(body.success, true);
    assert.ok((body.meta as Record<string, unknown>).traceId);
    assert.deepEqual(body.data, { ping: true });
  });

  it('预检方法在公开接口上是 204', () => {
    const res = hitokotoOptions(
      new NextRequest('http://localhost:3000/api/v1/hitokoto', { method: 'OPTIONS' }),
    );
    assert.equal(res.status, 204);
  });
});

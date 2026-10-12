import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { z } from 'zod';
import { NextRequest } from 'next/server';

import { ok, publicOk, withApiHandler } from '@/lib/server';
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

  it('公开接口的失败响应与成功同形：单层信封、data 为 null、meta 仍是 requestId/serverTime/site', async () => {
    const failing = withApiHandler(
      () => {
        throw new z.ZodError([
          { code: 'custom', message: 'platform 不支持', path: ['platform'] },
        ]);
      },
      {
        auth: false,
        envelope: 'public',
        route: '/api/v1/demo',
        query: z.object({ platform: z.string() }),
      },
    );

    const res = await run(failing, '/api/v1/demo?platform=x');
    assert.equal(res.status, 422);
    const body = (await res.json()) as Record<string, unknown>;
    assert.equal(body.success, undefined, '公开信封不带 success 位');
    assert.equal(body.statusCode, 422);
    assert.equal(body.data, null);
    assert.ok(Array.isArray(body.issues));
    assert.equal((body.issues as { field: string }[])[0]?.field, 'platform');

    const meta = body.meta as Record<string, unknown>;
    assert.ok(meta.requestId);
    assert.ok(Date.parse(String(meta.serverTime)) > 0);
    assert.equal(typeof meta.site, 'string');
    assert.equal(meta.requestId, res.headers.get('x-trace-id'));
  });

  it('控制台成功信封带 success 与 traceId', async () => {
    const handler = withApiHandler(() => ok({ ping: true }), { auth: false, route: '/api/v1/demo' });
    const body = (await (await run(handler, '/api/v1/demo')).json()) as Record<string, unknown>;
    assert.equal(body.success, true);
    assert.ok((body.meta as Record<string, unknown>).traceId);
    assert.deepEqual(body.data, { ping: true });
  });

  it('预检方法在公开接口上是 204', async () => {
    const res = await hitokotoOptions(
      new NextRequest('http://localhost:3000/api/v1/hitokoto', { method: 'OPTIONS' }),
    );
    assert.equal(res.status, 204);
  });

  it('维护模式只挡公开接口，控制台信封的接口照常响应', async () => {
    const settings = await import('@/lib/server/store/settings');
    const before = settings.getSiteSettings().maintenanceMode;
    const publicHandler = withApiHandler(() => publicOk({ ping: true }), {
      auth: false,
      envelope: 'public',
      route: '/api/v1/maintenance-me',
    });
    const consoleHandler = withApiHandler(() => ok({ ping: true }), {
      auth: false,
      route: '/api/v1/maintenance-console',
    });

    settings.patchSiteSettings({ maintenanceMode: true });
    try {
      const blocked = await run(publicHandler, '/api/v1/maintenance-me');
      assert.equal(blocked.status, 503);
      const body = (await blocked.json()) as Record<string, unknown>;
      assert.equal(body.statusCode, 503);
      assert.equal('success' in body, false, '503 也走单层公开信封');
      assert.equal(body.data, null);

      const stillOpen = await run(consoleHandler, '/api/v1/maintenance-console');
      assert.equal(stillOpen.status, 200);
    } finally {
      settings.patchSiteSettings({ maintenanceMode: before });
    }
  });
});

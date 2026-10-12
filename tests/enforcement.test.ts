import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { z } from 'zod';
import { NextRequest } from 'next/server';

import { ok, withApiHandler } from '@/lib/server';
import { preflight } from '@/lib/server/protection';
import { createRule, deleteRule, findAllRules } from '@/lib/server/store/rules';
import { patchSecuritySettings } from '@/lib/server/store/security';

type Handler = (request: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

const call = (handler: Handler, path: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  handler(new NextRequest(`http://localhost:3000${path}`, init), { params: Promise.resolve({}) });

const json = async (res: Response) => (await res.json()) as Record<string, unknown>;

/** 每个用例从干净的名单开始，避免上一个用例的配置漏进来 */
const resetPolicy = () => {
  patchSecuritySettings({ ipBlacklist: [], ipWhitelist: [], corsOrigins: [], maxBodySizeKb: 64, globalRateLimit: { limit: 100_000, periodSec: 3600 } });
  for (const rule of findAllRules()) deleteRule(rule.id);
};

const ipOf = (ip: string) => ({ headers: { 'x-forwarded-for': ip } });

describe('IP 名单', () => {
  it('黑名单命中直接 403，不再进入业务处理', async () => {
    resetPolicy();
    patchSecuritySettings({ ipBlacklist: ['203.0.113.24'] });
    let reached = false;
    const handler = withApiHandler(() => {
      reached = true;
      return ok({});
    }, { auth: false, route: '/api/v1/echo' });

    const res = await call(handler, '/api/v1/echo', ipOf('203.0.113.24'));
    assert.equal(res.status, 403);
    assert.equal(reached, false);
    assert.equal((await json(res)).success, false);
  });

  it('CIDR 段内的地址同样被拦', async () => {
    resetPolicy();
    patchSecuritySettings({ ipBlacklist: ['198.51.100.0/24'] });
    const handler = withApiHandler(() => ok({}), { auth: false, route: '/api/v1/echo' });
    assert.equal((await call(handler, '/api/v1/echo', ipOf('198.51.100.77'))).status, 403);
    assert.equal((await call(handler, '/api/v1/echo', ipOf('198.51.101.77'))).status, 200);
  });

  it('白名单豁免频控，但压不住黑名单', async () => {
    resetPolicy();
    patchSecuritySettings({ ipWhitelist: ['10.0.0.0/8'], ipBlacklist: ['10.9.9.9'] });
    const handler = withApiHandler(() => ok({}), { auth: false, route: '/api/v1/echo', rateLimitPerMin: 1 });

    assert.equal((await call(handler, '/api/v1/echo', ipOf('10.1.1.1'))).status, 200);
    assert.equal((await call(handler, '/api/v1/echo', ipOf('10.1.1.1'))).status, 200);
    assert.equal((await call(handler, '/api/v1/echo', ipOf('10.9.9.9'))).status, 403);
  });

  it('OPTIONS 预检也过黑名单：被拉黑的来源拿不到 204，也拿不到跨域头', async () => {
    resetPolicy();
    patchSecuritySettings({ ipBlacklist: ['203.0.113.88'], corsOrigins: ['https://allow.me'] });
    const handle = preflight();
    const blocked = await handle(
      new Request('http://localhost/api/v1/hitokoto', {
        method: 'OPTIONS',
        headers: { 'x-forwarded-for': '203.0.113.88', origin: 'https://allow.me' },
      }),
    );
    assert.equal(blocked.status, 403);
    assert.equal(blocked.headers.get('access-control-allow-origin'), null);
    // 预检不经 withApiHandler，安全头得自己带上，否则被拦的响应反而少了防护
    assert.equal(blocked.headers.get('x-frame-options'), 'DENY');

    const clean = await handle(
      new Request('http://localhost/api/v1/hitokoto', {
        method: 'OPTIONS',
        headers: { 'x-forwarded-for': '198.51.100.7', origin: 'https://allow.me' },
      }),
    );
    assert.equal(clean.status, 204);
    assert.equal(clean.headers.get('access-control-allow-origin'), 'https://allow.me');
    resetPolicy();
  });
});

describe('访问规则', () => {
  it('超出阈值按 action 返回 429，并点出规则名', async () => {
    resetPolicy();
    createRule({ name: '测试限流', scope: '/api/v1/echo', limit: 1, periodSec: 60, action: '429', enabled: true });
    const handler = withApiHandler(() => ok({}), { auth: false, route: '/api/v1/echo', rateLimitPerMin: 1000 });

    assert.equal((await call(handler, '/api/v1/echo', ipOf('192.0.2.1'))).status, 200);
    const blocked = await call(handler, '/api/v1/echo', ipOf('192.0.2.1'));
    assert.equal(blocked.status, 429);
    assert.ok(blocked.headers.get('retry-after'));
    assert.match(String((await json(blocked)).description), /测试限流/);
  });

  it('reject 处置返回 403', async () => {
    resetPolicy();
    createRule({ name: '硬拒', scope: '/api/v1/reject-me', limit: 1, periodSec: 60, action: 'reject', enabled: true });
    const reject = withApiHandler(() => ok({}), { auth: false, route: '/api/v1/reject-me', rateLimitPerMin: 1000 });
    await call(reject, '/api/v1/reject-me', ipOf('192.0.2.2'));
    assert.equal((await call(reject, '/api/v1/reject-me', ipOf('192.0.2.2'))).status, 403);
  });

  it('停用的规则完全不参与判定', async () => {
    resetPolicy();
    createRule({ name: '停用', scope: '/api/v1/echo', limit: 1, periodSec: 60, action: 'reject', enabled: false });
    const handler = withApiHandler(() => ok({}), { auth: false, route: '/api/v1/echo', rateLimitPerMin: 1000 });
    for (let i = 0; i < 3; i++) {
      assert.equal((await call(handler, '/api/v1/echo', ipOf('192.0.2.4'))).status, 200);
    }
  });

  it('命中并拦截才计入 hitsToday', async () => {
    resetPolicy();
    const rule = createRule({ name: '计数', scope: '/api/v1/counted', limit: 1, periodSec: 60, action: '429', enabled: true });
    const handler = withApiHandler(() => ok({}), { auth: false, route: '/api/v1/counted', rateLimitPerMin: 1000 });
    await call(handler, '/api/v1/counted', ipOf('192.0.2.5'));
    await call(handler, '/api/v1/counted', ipOf('192.0.2.5'));
    assert.equal(findAllRules().find((r) => r.id === rule.id)?.hitsToday, 1);
  });
});

describe('默认限额', () => {
  it('按路由模板计数，参数化路径共用一个桶', async () => {
    resetPolicy();
    const handler = withApiHandler(() => ok({}), { auth: false, route: '/api/v1/apis/[id]', rateLimitPerMin: 2 });
    assert.equal((await call(handler, '/api/v1/apis/aaa', ipOf('192.0.2.6'))).status, 200);
    assert.equal((await call(handler, '/api/v1/apis/bbb', ipOf('192.0.2.6'))).status, 200);
    assert.equal((await call(handler, '/api/v1/apis/ccc', ipOf('192.0.2.6'))).status, 429);
  });
});

describe('CORS', () => {
  it('配置内的来源才拿到 Allow-Origin，同时带 Vary', async () => {
    resetPolicy();
    patchSecuritySettings({ corsOrigins: ['https://allow.me'] });
    const handler = withApiHandler(() => ok({}), { auth: false, route: '/api/v1/echo' });

    const allowed = await call(handler, '/api/v1/echo', { headers: { origin: 'https://allow.me' } });
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://allow.me');
    assert.equal(allowed.headers.get('vary'), 'Origin');

    const denied = await call(handler, '/api/v1/echo', { headers: { origin: 'https://evil.me' } });
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
  });

  it('失败响应也带跨域头，否则浏览器只看得见 CORS 错误', async () => {
    resetPolicy();
    patchSecuritySettings({ corsOrigins: ['https://allow.me'] });
    const handler = withApiHandler(
      () => {
        throw new z.ZodError([]);
      },
      { auth: false, route: '/api/v1/echo', body: z.object({ a: z.string() }) },
    );
    const res = await call(handler, '/api/v1/echo', { method: 'POST', headers: { origin: 'https://allow.me' } });
    assert.ok(res.status >= 400);
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://allow.me');
  });

  it('预检：配置内声明方法与头，配置外只回 204', async () => {
    resetPolicy();
    patchSecuritySettings({ corsOrigins: ['https://allow.me'] });
    const options = preflight();

    const allowed = await options(new NextRequest('http://localhost:3000/api/v1/hitokoto', { method: 'OPTIONS', headers: { origin: 'https://allow.me' } }));
    assert.equal(allowed.status, 204);
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://allow.me');
    assert.match(String(allowed.headers.get('access-control-allow-methods')), /GET/);

    const denied = await options(new NextRequest('http://localhost:3000/api/v1/hitokoto', { method: 'OPTIONS', headers: { origin: 'https://evil.me' } }));
    assert.equal(denied.status, 204);
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
  });
});

describe('请求体上限', () => {
  /** 用真实体积驱动 content-length，手工塞的头会被 fetch 实现按 body 重算 */
  const bigBody = JSON.stringify({ list: ['x'.repeat(2000)] });

  it('超过 maxBodySizeKb 拒掉，放宽后同一份请求就能过', async () => {
    resetPolicy();
    const handler = withApiHandler(() => ok({}), {
      auth: false,
      route: '/api/v1/echo',
      body: z.object({ list: z.array(z.string()) }),
    });
    const post = () =>
      call(handler, '/api/v1/echo', {
        method: 'POST',
        // fetch 的 Request 不会自动带上 content-length，真实 HTTP 请求会，所以这里显式声明
        headers: { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(bigBody)) },
        body: bigBody,
      });

    patchSecuritySettings({ maxBodySizeKb: 1 });
    const rejected = await post();
    assert.equal(rejected.status, 422);
    assert.match(String((await json(rejected)).description), /请求体过大/);

    patchSecuritySettings({ maxBodySizeKb: 64 });
    assert.equal((await post()).status, 200);
  });

  it('不带 content-length 也拦得住（分块传输不能绕过上限）', async () => {
    resetPolicy();
    patchSecuritySettings({ maxBodySizeKb: 1 });
    const handler = withApiHandler(() => ok({}), {
      auth: false,
      route: '/api/v1/echo',
      body: z.object({ list: z.array(z.string()) }),
    });
    const res = await call(handler, '/api/v1/echo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ list: ['y'.repeat(2000)] }),
    });
    assert.equal(res.status, 422);
    assert.match(String((await json(res)).description), /请求体过大/);
  });
});

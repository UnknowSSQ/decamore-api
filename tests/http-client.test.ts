import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { ERROR_CODE } from '@/types';
import { http } from '@/lib/api/http';

type FetchImpl = (url: string, init?: RequestInit) => Response;

let lastUrl: string | null = null;
let respondWith: FetchImpl = () => new Response(JSON.stringify({}), { status: 200 });

beforeEach(() => {
  lastUrl = null;
  respondWith = () => new Response(JSON.stringify({}), { status: 200 });
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    lastUrl = String(url);
    return respondWith(lastUrl, init);
  }) as typeof fetch;
  // 覆盖全局 fetch，不依赖真实网络
  (globalThis as { fetch: typeof fetch }).fetch = fakeFetch;
});

afterEach(() => {
  // 还原默认的全局 fetch，避免污染其它用例
  delete (globalThis as { fetch?: typeof fetch }).fetch;
});

describe('http 客户端信封解析', () => {
  it('公开信封：statusCode=OK 时返回 data', async () => {
    respondWith = () =>
      new Response(
        JSON.stringify({ statusCode: ERROR_CODE.OK, message: 'success', data: { content: 'hi' }, meta: { requestId: 'r1' } }),
        { status: 200 },
      );
    const data = await http.get<{ content: string }>('/api/v1/hitokoto', { envelope: 'public', anonymous: true });
    assert.deepEqual(data, { content: 'hi' });
  });

  it('公开信封：statusCode≠OK 时抛出 RequestError 并透传 message', async () => {
    respondWith = () =>
      new Response(
        JSON.stringify({ statusCode: 422, message: 'platform 非法', data: null, meta: { requestId: 'r2' } }),
        { status: 422 },
      );
    await assert.rejects(
      () => http.get('/api/v1/hitokoto', { envelope: 'public', anonymous: true }),
      (err: unknown) => {
        const e = err as { code?: number; message?: string };
        return e.code === 422 && Boolean(e.message?.includes('platform'));
      },
    );
  });

  it('控制台信封：success=false 时抛出并透传 issues', async () => {
    respondWith = () =>
      new Response(
        JSON.stringify({
          success: false,
          statusCode: 422,
          message: '校验失败',
          description: 'platform：xxx',
          issues: [{ field: 'platform', message: 'xxx', code: 'invalid_type' }],
          meta: { timestamp: 1, traceId: 't' },
        }),
        { status: 422 },
      );
    await assert.rejects(
      () => http.get('/x', { anonymous: true }),
      (err: unknown) => {
        const e = err as { issues?: Array<{ field: string }> };
        return Boolean(e.issues && e.issues[0]?.field === 'platform');
      },
    );
  });

  it('query 数组序列化为重复键', async () => {
    respondWith = (url) => {
      assert.ok(url.includes('platform=a') && url.includes('platform=b'), `URL 应含重复键: ${url}`);
      return new Response(JSON.stringify({ statusCode: ERROR_CODE.OK, message: 'ok', data: null, meta: {} }), { status: 200 });
    };
    await http.get('/api/v1/hotsearch', { envelope: 'public', anonymous: true, query: { platform: ['a', 'b'] } });
  });

  it('204 视为成功且无响应体', async () => {
    respondWith = () => new Response(null, { status: 204 });
    const data = await http.delete('/api/v1/x', { anonymous: true });
    assert.equal(data, undefined);
  });
});

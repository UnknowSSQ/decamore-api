import './setup';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { http, RequestError } from '@/lib/api/http';

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

/** 桩一个固定响应的 fetch，断言请求真的发出去了 */
function stub(status: number, body?: string, init?: ResponseInit) {
  const calls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response(body ?? null, { status, ...init });
  }) as typeof fetch;
  return calls;
}

describe('http 对 204 的处理', () => {
  it('204 空响应算成功，不再被判成响应解析失败', async () => {
    const calls = stub(204);
    const result = await http.delete<void>('/api/v1/rules/rule_001');

    assert.equal(result, undefined);
    assert.match(calls[0] ?? '', /\/api\/v1\/rules\/rule_001$/);
  });

  it('500 空响应仍然报错，不能被 204 分支顺手放过', async () => {
    stub(500);
    await assert.rejects(() => http.delete<void>('/api/v1/rules/rule_002'), RequestError);
  });

  it('200 + 控制台信封正常取 data', async () => {
    stub(
      200,
      JSON.stringify({ statusCode: 200, success: true, message: 'ok', data: { ipWhitelist: ['10.0.0.1'] }, meta: { timestamp: 1, traceId: 't' } }),
      { headers: { 'content-type': 'application/json' } },
    );
    const body = await http.get<{ ipWhitelist: string[] }>('/api/v1/security');
    assert.deepEqual(body.ipWhitelist, ['10.0.0.1']);
  });
});

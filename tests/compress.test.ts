import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { describe, it } from 'node:test';

import { NextRequest, NextResponse } from 'next/server';

import { compressJson } from '@/lib/server/compress';
import { GET as idioms } from '@/app/api/v1/idioms/route';

/** 比 MIN_BYTES 大的负载：60 条重复短句，压前压后都算得清 */
const BIG = JSON.stringify({ items: Array.from({ length: 60 }, (_, i) => `第 ${i} 条榜单条目，内容足够长以越过一千字节的门槛`) });

describe('compressJson', () => {
  it('带 gzip 的大 JSON 压得动，原来的头一条不丢', async () => {
    const source = NextResponse.json(JSON.parse(BIG), {
      status: 201,
      headers: { 'cache-control': 'public, max-age=60', 'x-trace-id': 'abc123', 'access-control-allow-origin': '*' },
    });

    const out = await compressJson(source, 'gzip, deflate, br');

    assert.equal(out.status, 201, '状态码要保住');
    assert.equal(out.headers.get('content-encoding'), 'gzip');
    assert.equal(out.headers.get('vary'), 'Accept-Encoding');
    assert.equal(out.headers.get('cache-control'), 'public, max-age=60');
    assert.equal(out.headers.get('x-trace-id'), 'abc123');
    assert.equal(out.headers.get('access-control-allow-origin'), '*');

    const raw = Buffer.from(await out.arrayBuffer());
    assert.equal(out.headers.get('content-length'), String(raw.byteLength), 'content-length 要说的是压完的字节数');
    assert.ok(raw.byteLength < Buffer.byteLength(BIG, 'utf8') / 4, `压缩该有实效，实测 ${raw.byteLength} / ${Buffer.byteLength(BIG, 'utf8')} 字节`);
    assert.equal(gunzipSync(raw).toString('utf8'), JSON.stringify(JSON.parse(BIG)));
  });

  it('客户端没声明 gzip 就原样发', async () => {
    const source = NextResponse.json(JSON.parse(BIG));
    const out = await compressJson(source, 'br');

    assert.equal(out.headers.get('content-encoding'), null);
    assert.equal((await out.text()).length, BIG.length);
  });

  it('小 body 不压，非 JSON 不压，已编码的不压', async () => {
    const small = await compressJson(NextResponse.json({ ok: true }), 'gzip');
    assert.equal(small.headers.get('content-encoding'), null, '一千字节以下不值得压');
    assert.deepEqual(await small.json(), { ok: true }, '读空原响应后仍要能发得出 body');

    const binary = new NextResponse(new Uint8Array(4_096), { headers: { 'content-type': 'image/jpeg' } });
    assert.equal((await compressJson(binary, 'gzip')).headers.get('content-encoding'), null);

    const already = NextResponse.json(JSON.parse(BIG), { headers: { 'content-encoding': 'br' } });
    assert.equal((await compressJson(already, 'gzip')).headers.get('content-encoding'), 'br');
  });

  it('带 Set-Cookie 的响应不重建：登录一次要写三个 cookie', async () => {
    const source = NextResponse.json({ token: 'x'.repeat(200) });
    source.cookies.set('decamore_access', 'a');
    source.cookies.set('decamore_csrf', 'b');

    const out = await compressJson(source, 'gzip');

    assert.equal(out.headers.get('content-encoding'), null, '有 cookie 就整个跳过，不去猜 cookie 怎么并头');
    assert.equal(out.headers.getSetCookie().length, 2, 'cookie 得原样还在');
  });

  it('真实公开路由的响应出网时已压好', async () => {
    const request = new NextRequest('http://localhost:3000/api/v1/idioms?limit=100', {
      headers: { 'accept-encoding': 'gzip, deflate, br' },
    });
    const res = await idioms(request, { params: Promise.resolve({}) });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-encoding'), 'gzip');
    assert.ok(res.headers.get('x-trace-id'), '重建响应不能把 x-trace-id 弄丢');
    assert.ok(res.headers.get('cache-control'), 'Cache-Control 也要保住');
    const packed = Buffer.from(await res.arrayBuffer());
    const text = gunzipSync(packed).toString('utf8');
    const rawBytes = Buffer.byteLength(text, 'utf8');
    assert.ok(packed.byteLength < rawBytes, `压完该变小，实测 ${packed.byteLength} / ${rawBytes} 字节`);
    assert.equal(JSON.parse(text).statusCode, 200, '解压出来的还是那个信封');
  });
});

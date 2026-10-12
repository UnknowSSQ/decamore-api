/**
 * JSON 响应的 gzip。`next start` 自带的压缩只作用于页面，Route Handler 是原样出网的：
 * 实测同一个进程里 `/` 带 `Content-Encoding: gzip`，而 `/api/v1/warning` 262,245 字节
 * 在客户端声明 `Accept-Encoding: gzip` 时仍然一分不少地发过去（gzip -6 只要 20,910 字节）。
 */
import 'server-only';

import { promisify } from 'node:util';
import { gzip } from 'node:zlib';

import { NextResponse } from 'next/server';

const gzipAsync = promisify(gzip);

/** 与 Next 自带压缩同一个门槛：几百字节的响应压不出多少，还多一次编解码 */
const MIN_BYTES = 1_024;

export async function compressJson(
  response: NextResponse,
  acceptEncoding: string | null,
): Promise<NextResponse> {
  if (!acceptEncoding?.toLowerCase().includes('gzip')) return response;
  if (response.headers.getSetCookie().length > 0) return response;
  if (response.headers.get('content-encoding')) return response;
  if (!response.headers.get('content-type')?.startsWith('application/json')) return response;

  const bytes = new Uint8Array(await response.arrayBuffer());
  const headers = new Headers(response.headers);
  // 读空了就不能再把原响应交出去，压不动（极小或已压缩的内容）也得用同一份字节重建
  if (bytes.byteLength < MIN_BYTES) return new NextResponse(bytes, { status: response.status, headers });

  const packed = await gzipAsync(bytes);
  if (packed.byteLength >= bytes.byteLength) return new NextResponse(bytes, { status: response.status, headers });

  headers.set('content-encoding', 'gzip');
  headers.set('content-length', String(packed.byteLength));
  headers.append('vary', 'Accept-Encoding');
  return new NextResponse(packed, { status: response.status, headers });
}

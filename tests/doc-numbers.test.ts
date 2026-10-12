import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { UPSTREAM_TIMEOUT_ROW } from '@/components/docs/commonSections';
import { UPSTREAM_TIMEOUT_MS } from '@/lib/server/upstream';

/** 文档正文里的数字必须跟着实现走：这几条把唯一还写死的秒数与常量对上 */
describe('文档数字与实现对齐', () => {
  const sentence = UPSTREAM_TIMEOUT_ROW.description.map((fragment) => fragment.value).join('');

  it('「服务端等待上限」那句话用的就是 upstream.ts 的超时常量', () => {
    assert.ok(
      sentence.includes(`${UPSTREAM_TIMEOUT_MS / 1000} 秒`),
      `UPSTREAM_TIMEOUT_MS 是 ${UPSTREAM_TIMEOUT_MS}，文档写的是：${sentence}`,
    );
  });

  it('这一行仍然只讲 5xx 重试、4xx 不重试', () => {
    assert.match(sentence, /5xx/);
    assert.match(sentence, /4xx/);
  });
});

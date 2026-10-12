import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { csrfDecision } from '@/utils/csrf';

const COOKIE = 'csrf-abc';

describe('csrfDecision', () => {
  it('route 显式关闭时不校验', () => {
    assert.equal(csrfDecision({ required: false, viaHeader: false, header: null, cookie: null }).verdict, 'skip');
  });

  it('Bearer 头会话跳过双提交（浏览器不会自动带这个头）', () => {
    assert.equal(csrfDecision({ required: true, viaHeader: true, header: null, cookie: null }).verdict, 'skip');
  });

  it('cookie 会话下缺 Token 或缺 Cookie 都算失败，不再把缺失当通过', () => {
    assert.equal(csrfDecision({ required: true, viaHeader: false, header: null, cookie: COOKIE }).verdict, 'fail');
    assert.equal(csrfDecision({ required: true, viaHeader: false, header: 'x', cookie: null }).verdict, 'fail');
    assert.equal(csrfDecision({ required: true, viaHeader: false, header: null, cookie: null }).verdict, 'fail');
  });

  it('只有头与 Cookie 一致才放行', () => {
    assert.equal(csrfDecision({ required: true, viaHeader: false, header: 'other', cookie: COOKIE }).verdict, 'fail');
    assert.equal(csrfDecision({ required: true, viaHeader: false, header: COOKIE, cookie: COOKIE }).verdict, 'pass');
  });
});

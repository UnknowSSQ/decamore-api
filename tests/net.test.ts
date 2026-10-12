import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ipInList, ipMatchesPattern, originAllowed, scopeMatches, scopeSpecificity } from '@/utils/net';

describe('ipMatchesPattern', () => {
  it('裸地址要求逐位相等', () => {
    assert.equal(ipMatchesPattern('203.0.113.24', '203.0.113.24'), true);
    assert.equal(ipMatchesPattern('203.0.113.25', '203.0.113.24'), false);
  });

  it('IPv4 CIDR 按前缀命中', () => {
    assert.equal(ipMatchesPattern('10.1.2.3', '10.0.0.0/8'), true);
    assert.equal(ipMatchesPattern('172.16.9.9', '172.16.0.0/12'), true);
    assert.equal(ipMatchesPattern('172.32.0.1', '172.16.0.0/12'), false);
    assert.equal(ipMatchesPattern('192.0.2.18', '192.0.2.18/32'), true);
    assert.equal(ipMatchesPattern('192.0.2.19', '192.0.2.18/32'), false);
  });

  it('/0 覆盖全部 v4 地址', () => {
    assert.equal(ipMatchesPattern('8.8.8.8', '0.0.0.0/0'), true);
  });

  it('IPv6 支持 :: 缩写与网段', () => {
    assert.equal(ipMatchesPattern('2001:db8::1', '2001:db8::/32'), true);
    assert.equal(ipMatchesPattern('2001:db9::1', '2001:db8::/32'), false);
    assert.equal(ipMatchesPattern('::1', '::1'), true);
  });

  it('族不同不互认，非法输入一律不匹配', () => {
    assert.equal(ipMatchesPattern('10.0.0.1', '2001:db8::/32'), false);
    assert.equal(ipMatchesPattern('10.0.0.1', 'not-an-ip'), false);
    assert.equal(ipMatchesPattern('10.0.0.1', '10.0.0.0/33'), false);
    assert.equal(ipMatchesPattern('999.1.1.1', '999.1.1.1'), false);
  });

  it('ipInList 任一命中即真', () => {
    assert.equal(ipInList('10.9.9.9', ['192.168.0.1', '10.0.0.0/8']), true);
    assert.equal(ipInList('11.0.0.1', ['192.168.0.1', '10.0.0.0/8']), false);
    assert.equal(ipInList('11.0.0.1', []), false);
  });
});

describe('originAllowed', () => {
  it('* 放行所有来源', () => {
    assert.equal(originAllowed('https://anything.dev', ['*']), true);
  });

  it('精确匹配，忽略尾斜杠与大小写', () => {
    assert.equal(originAllowed('https://decamore.dev', ['https://decamore.dev']), true);
    assert.equal(originAllowed('https://decamore.dev/', ['https://decamore.dev']), true);
    assert.equal(originAllowed('https://DECAMORE.dev', ['https://decamore.dev']), true);
  });

  it('不做子域通配，也不忽略端口与协议', () => {
    assert.equal(originAllowed('https://admin.decamore.dev', ['https://decamore.dev']), false);
    assert.equal(originAllowed('http://decamore.dev', ['https://decamore.dev']), false);
    assert.equal(originAllowed('https://decamore.dev:8443', ['https://decamore.dev']), false);
  });
});

describe('scopeMatches', () => {
  it('global 与空值命中一切', () => {
    assert.equal(scopeMatches('global', '/api/v1/hitokoto'), true);
    assert.equal(scopeMatches('', '/anything'), true);
  });

  it('尾部 * 走前缀，精确项要整段相等', () => {
    assert.equal(scopeMatches('/api/v1/*', '/api/v1/hitokoto'), true);
    assert.equal(scopeMatches('/api/v1/*', '/api/v2/hitokoto'), false);
    assert.equal(scopeMatches('/api/v1/hitokoto', '/api/v1/hitokoto'), true);
    assert.equal(scopeMatches('/api/v1/hitokoto', '/api/v1/hitokoto/extra'), false);
  });

  it('逗号列表任一命中', () => {
    assert.equal(scopeMatches('/api/v1/hotsearch,/api/v1/hotmusic', '/api/v1/hotmusic'), true);
    assert.equal(scopeMatches('/api/v1/hotsearch,/api/v1/hotmusic', '/api/v1/hotplay'), false);
  });
});

describe('scopeSpecificity', () => {
  it('global < 通配或列表 < 单条精确路径', () => {
    assert.equal(scopeSpecificity('global'), 0);
    assert.equal(scopeSpecificity('/api/v1/*'), 1);
    assert.equal(scopeSpecificity('/a,/b'), 1);
    assert.equal(scopeSpecificity('/api/v1/auth/login'), 2);
  });
});

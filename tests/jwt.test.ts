import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SignJWT } from 'jose';

import { getServerEnv } from '@/env';
import { TOKEN_TYPE } from '@/constants/auth';
import { issueToken, verifyToken } from '@/lib/auth/jwt';

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getServerEnv().JWT_SECRET);
}

describe('auth/jwt 令牌签发与校验', () => {
  it('access 令牌可签发并被校验，claims 完整', async () => {
    const token = await issueToken({ sub: 'usr_001', name: 'admin', role: 'admin', type: TOKEN_TYPE.access });
    const result = await verifyToken(token, TOKEN_TYPE.access);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.claims.sub, 'usr_001');
      assert.equal(result.claims.typ, 'access');
      assert.ok(result.claims.exp > result.claims.iat, 'exp 应晚于 iat');
    }
  });

  it('用 access 令牌去验 refresh 类型应判 wrong_type', async () => {
    const token = await issueToken({ sub: 'u', name: 'admin', role: 'admin', type: TOKEN_TYPE.access });
    const result = await verifyToken(token, TOKEN_TYPE.refresh);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'wrong_type');
  });

  it('非法字符串返回 malformed', async () => {
    const result = await verifyToken('garbage.token.here');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'malformed');
  });

  it('篡改签名的令牌校验失败', async () => {
    const token = await issueToken({ sub: 'u', name: 'admin', role: 'admin', type: TOKEN_TYPE.access });
    const tampered = token.slice(0, -3) + (token.endsWith('aaa') ? 'bbb' : 'aaa');
    const result = await verifyToken(tampered, TOKEN_TYPE.access);
    assert.equal(result.ok, false);
  });

  it('过期令牌返回 expired', async () => {
    const now = Math.floor(Date.now() / 1000);
    const expired = await new SignJWT({ sub: 'u', name: 'admin', role: 'admin', typ: 'access', jti: 'x' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(now - 100)
      .setExpirationTime(now - 50)
      .setIssuer('decamore-api')
      .setAudience('decamore-console')
      .sign(secretKey());
    const result = await verifyToken(expired, TOKEN_TYPE.access);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, 'expired');
  });
});

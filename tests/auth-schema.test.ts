import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { changePasswordSchema, loginSchema } from '@/lib/zod/auth.schema';

describe('auth schema 校验', () => {
  it('changePasswordSchema 要求两次新口令一致', () => {
    const bad = changePasswordSchema.safeParse({
      currentPassword: 'Aaa11111',
      newPassword: 'Bbb22222',
      confirmPassword: 'Ccc33333',
    });
    assert.equal(bad.success, false);
  });

  it('changePasswordSchema 要求新口令含大小写与数字', () => {
    const ok = changePasswordSchema.safeParse({
      currentPassword: 'Aaa11111',
      newPassword: 'Abcdefg1',
      confirmPassword: 'Abcdefg1',
    });
    assert.equal(ok.success, true);

    const noDigit = changePasswordSchema.safeParse({
      currentPassword: 'Aaa11111',
      newPassword: 'Abcdefgh',
      confirmPassword: 'Abcdefgh',
    });
    assert.equal(noDigit.success, false);
  });

  it('changePasswordSchema 拒绝全重复字符的新口令', () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: 'Aaa11111',
      newPassword: 'Aaaaaaaa',
      confirmPassword: 'Aaaaaaaa',
    });
    assert.equal(r.success, false);
  });

  it('loginSchema 拒绝多余字段（strict）', () => {
    const r = loginSchema.safeParse({ account: 'admin', password: 'Aaa11111', remember: false, extra: 1 });
    assert.equal(r.success, false);
  });

  it('loginSchema 接受最小合法登录体', () => {
    const r = loginSchema.safeParse({ account: 'admin', password: 'Aaa11111' });
    assert.equal(r.success, true);
  });
});

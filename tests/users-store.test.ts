import assert from 'node:assert/strict';
import { randomBytes, scryptSync } from 'node:crypto';
import { describe, it } from 'node:test';

import { SEED_ACCOUNT, findUserByAccount, updatePassword, verifyPassword } from '@/lib/server/store/users';

/** 按 store 里的格式自己造一个哈希：`scrypt$<saltB64>$<hashB64>`，用例不需要知道任何真实口令 */
function makeHash(plain: string): string {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('base64')}$${scryptSync(plain, salt, 64).toString('base64')}`;
}

describe('store/users 口令哈希与改密', () => {
  it('verifyPassword 匹配正确口令、拒绝错误口令', () => {
    const hash = makeHash('first-pass');

    assert.equal(verifyPassword(hash, 'first-pass'), true);
    assert.equal(verifyPassword(hash, 'First-pass'), false, '大小写不同就是不同口令');
    assert.equal(verifyPassword(hash, ''), false);
  });

  it('verifyPassword 对非法哈希格式返回 false 而不是抛错', () => {
    assert.equal(verifyPassword('not-a-hash', 'anything'), false);
    assert.equal(verifyPassword('', 'anything'), false);
    assert.equal(verifyPassword('bcrypt$x$y', 'anything'), false, '算法段不是 scrypt 就不认');
  });

  it('updatePassword 重算哈希，且旧口令立刻失效', () => {
    // 种子账号名从 store 取，别在这里写死字面量：换账号只该红一处
    const before = findUserByAccount(SEED_ACCOUNT);
    assert.ok(before, '种子里必须有一个可登录账号');
    const seededHash = before.passwordHash;

    assert.equal(updatePassword(SEED_ACCOUNT, 'temp-pass-A'), true);
    const afterA = findUserByAccount(SEED_ACCOUNT)!;
    assert.notEqual(afterA.passwordHash, seededHash, '哈希应被重算');
    assert.equal(verifyPassword(afterA.passwordHash, 'temp-pass-A'), true, '新口令应可验证');

    assert.equal(updatePassword(SEED_ACCOUNT, 'temp-pass-B'), true);
    const afterB = findUserByAccount(SEED_ACCOUNT)!;
    assert.equal(verifyPassword(afterB.passwordHash, 'temp-pass-A'), false, '旧口令立刻失效');
    assert.equal(verifyPassword(afterB.passwordHash, 'temp-pass-B'), true);
  });

  it('updatePassword 对不存在的账号返回 false', () => {
    assert.equal(updatePassword('ghost-account', 'whatever'), false);
  });
});

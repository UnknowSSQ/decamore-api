/**
 * 服务端专用：读取 JWT_SECRET，禁止客户端 import。
 * jose 是 Web API 实现，Edge / Node 运行时都能用。
 */
import 'server-only';

import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'node:crypto';

import { getServerEnv } from '@/env';
import { TOKEN_TYPE, type TokenType } from '@/constants/auth';
import type { Role } from '@/constants/auth';

export interface AccessTokenClaims {
  sub: string;
  name: string;
  role: Role;
  typ: 'access';
  exp: number;
  iat: number;
  jti: string;
}

export interface RefreshTokenClaims extends Omit<AccessTokenClaims, 'typ'> {
  typ: 'refresh';
}

function secretKey(): Uint8Array {
  const { JWT_SECRET } = getServerEnv();
  return new TextEncoder().encode(JWT_SECRET);
}

interface IssueOptions {
  sub: string;
  name: string;
  role: Role;
  type: TokenType;
  /** 覆盖默认有效期（秒），登录「记住我」时 refresh 会更长 */
  ttlSec?: number;
}

/** 显式写入 typ claim：access 与 refresh 不可互换，verifyToken 会校验它 */
export async function issueToken({ sub, name, role, type, ttlSec }: IssueOptions): Promise<string> {
  const env = getServerEnv();
  const ttl = ttlSec ?? (type === TOKEN_TYPE.access ? env.JWT_ACCESS_TTL_SEC : env.JWT_REFRESH_TTL_SEC);
  const jti = randomUUID();

  return new SignJWT({ sub, name, role, typ: type, jti })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .setIssuer('decamore-api')
    .setAudience('decamore-console')
    .sign(secretKey());
}

/** 不抛异常，失败原因交给调用方映射响应码 */
export type VerifyResult =
  | { ok: true; claims: AccessTokenClaims | RefreshTokenClaims }
  | { ok: false; reason: 'malformed' | 'expired' | 'invalid' | 'wrong_type' };

/** @param expected 期望的 typ，不传则两种都接受 */
export async function verifyToken(
  token: string,
  expected?: TokenType,
): Promise<VerifyResult> {
  if (!token) return { ok: false, reason: 'malformed' };

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: 'decamore-api',
      audience: 'decamore-console',
    });

    const typ = payload.typ;
    if (typ !== TOKEN_TYPE.access && typ !== TOKEN_TYPE.refresh) {
      return { ok: false, reason: 'invalid' };
    }
    if (expected && typ !== expected) return { ok: false, reason: 'wrong_type' };

    const sub = payload.sub;
    const name = payload.name;
    const role = payload.role;
    if (typeof sub !== 'string' || typeof name !== 'string' || !isRole(role) || typeof payload.exp !== 'number') {
      return { ok: false, reason: 'invalid' };
    }

    return {
      ok: true,
      claims: {
        sub,
        name,
        role,
        typ,
        exp: payload.exp,
        iat: payload.iat ?? 0,
        jti: typeof payload.jti === 'string' ? payload.jti : '',
      },
    };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'ERR_JWT_EXPIRED') return { ok: false, reason: 'expired' };
    return { ok: false, reason: 'malformed' };
  }
}

/** 历史 Cookie 里的 operator / viewer 一律视为无效会话，逼出重新登录，不能让旧令牌静默升级成管理员 */
function isRole(value: unknown): value is Role {
  return value === 'admin';
}

/** 浏览器可见，配合双提交校验 */
export function generateCsrfToken(): string {
  return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '').slice(0, 16);
}

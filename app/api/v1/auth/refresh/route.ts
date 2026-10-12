import { defineRoute, ok, UnauthorizedError } from '@/lib/server';
import { API } from '@/lib/api/endpoints';
import { readTokenFromRequest, writeSessionCookies } from '@/lib/auth/session';
import { generateCsrfToken, issueToken, verifyToken } from '@/lib/auth/jwt';
import { TOKEN_TYPE } from '@/constants/auth';
import { getServerEnv } from '@/env';
import type { RefreshResult } from '@/types';

export const POST = defineRoute(
  {
    auth: false,
    route: API.auth.refresh,
  },
  async () => {
    const refreshToken = await readTokenFromRequest('refresh');
    if (!refreshToken) {
      throw new UnauthorizedError('缺少刷新令牌', '请重新登录');
    }

    const result = await verifyToken(refreshToken, TOKEN_TYPE.refresh);
    if (!result.ok) {
      throw new UnauthorizedError('刷新令牌无效或已过期', '请重新登录');
    }

    const { claims } = result;
    const env = getServerEnv();
    const accessToken = await issueToken({
      sub: claims.sub,
      name: claims.name,
      role: claims.role,
      type: TOKEN_TYPE.access,
    });

    const csrfToken = generateCsrfToken();
    // 不传 refreshToken：沿用原刷新令牌，其 Cookie 有效期不续期
    await writeSessionCookies({ accessToken, csrfToken });

    const response: RefreshResult = {
      accessToken,
      expiresIn: env.JWT_ACCESS_TTL_SEC,
      tokenType: 'Bearer',
    };

    return ok(response, { message: '刷新成功' });
  },
);

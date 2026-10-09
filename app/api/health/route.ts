import { defineRoute, ok } from '@/lib/server';
import { APP_VERSION } from '@/constants/app';
import { getServerEnv } from '@/env';

// 探活请求量大，不计入调用统计
export const GET = defineRoute(
  { auth: false, route: '/api/health', track: false },
  () => {
    const env = getServerEnv();
    return ok({
      status: 'healthy',
      uptime: process.uptime(),
      version: APP_VERSION,
      environment: env.NODE_ENV,
      timestamp: Date.now(),
    });
  },
);

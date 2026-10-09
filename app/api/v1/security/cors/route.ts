import { defineRoute, ok } from '@/lib/server';
import { corsSchema } from '@/lib/zod/admin.schema';
import { patchSecuritySettings } from '@/lib/server/mock/security';
import { PERMISSIONS } from '@/constants/auth';

export const POST = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.securityWrite,
    body: corsSchema,
    route: '/api/v1/security/cors',
  },
  async (_req, { body }) => {
    const { origins } = body!;
    patchSecuritySettings({ corsOrigins: origins });

    return ok({ corsOrigins: origins }, { message: 'CORS 配置已更新' });
  },
);

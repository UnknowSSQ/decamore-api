import { defineRoute, ok } from '@/lib/server';
import { securityPatchSchema } from '@/lib/zod/admin.schema';
import { getSecuritySettings, patchSecuritySettings } from '@/lib/server/mock/security';
import { PERMISSIONS } from '@/constants/auth';

export const GET = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.securityWrite,
    route: '/api/v1/security',
  },
  () => {
    const settings = getSecuritySettings();
    return ok(settings);
  },
);

export const PATCH = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.securityWrite,
    body: securityPatchSchema,
    route: '/api/v1/security',
  },
  async (_req, { body }) => {
    const updated = patchSecuritySettings(body!);
    return ok(updated, { message: '安全配置已更新' });
  },
);

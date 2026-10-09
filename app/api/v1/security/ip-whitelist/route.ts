import { defineRoute, ok, noContent } from '@/lib/server';
import { ipListSchema, ipRemoveSchema } from '@/lib/zod/admin.schema';
import { getSecuritySettings, patchSecuritySettings } from '@/lib/server/mock/security';
import { PERMISSIONS } from '@/constants/auth';

export const POST = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.securityWrite,
    body: ipListSchema,
    route: '/api/v1/security/ip-whitelist',
  },
  async (_req, { body }) => {
    const { list } = body!;
    const settings = getSecuritySettings();
    const merged = Array.from(new Set([...settings.ipWhitelist, ...list]));
    patchSecuritySettings({ ipWhitelist: merged });

    return ok({ ipWhitelist: merged }, { message: '白名单已更新' });
  },
);

export const DELETE = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.securityWrite,
    query: ipRemoveSchema,
    route: '/api/v1/security/ip-whitelist',
  },
  async (_req, { query }) => {
    const { ip } = query!;
    const settings = getSecuritySettings();
    const filtered = settings.ipWhitelist.filter((i) => i !== ip);
    patchSecuritySettings({ ipWhitelist: filtered });

    return noContent();
  },
);

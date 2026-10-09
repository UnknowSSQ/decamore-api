import { defineRoute, ok, noContent } from '@/lib/server';
import { ipListSchema, ipRemoveSchema } from '@/lib/zod/admin.schema';
import { getSecuritySettings, patchSecuritySettings } from '@/lib/server/mock/security';
import { PERMISSIONS } from '@/constants/auth';

export const POST = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.securityWrite,
    body: ipListSchema,
    route: '/api/v1/security/ip-blacklist',
  },
  async (_req, { body }) => {
    const { list } = body!;
    const settings = getSecuritySettings();
    const merged = Array.from(new Set([...settings.ipBlacklist, ...list]));
    patchSecuritySettings({ ipBlacklist: merged });

    return ok({ ipBlacklist: merged }, { message: '黑名单已更新' });
  },
);

export const DELETE = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.securityWrite,
    query: ipRemoveSchema,
    route: '/api/v1/security/ip-blacklist',
  },
  async (_req, { query }) => {
    const { ip } = query!;
    const settings = getSecuritySettings();
    const filtered = settings.ipBlacklist.filter((i) => i !== ip);
    patchSecuritySettings({ ipBlacklist: filtered });

    return noContent();
  },
);

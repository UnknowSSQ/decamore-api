import { defineRoute, ok, noContent } from '@/lib/server';
import { ipListSchema, ipRemoveSchema } from '@/lib/zod/admin.schema';
import { getSecuritySettings, patchSecuritySettings } from '@/lib/server/store/security';
import { PERMISSIONS } from '@/constants/auth';

export const POST = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.securityWrite,
    body: ipListSchema,
    route: '/api/v1/security/ip-whitelist',
  },
  (_req, { body }) => {
    // 覆盖式：界面提交的是编辑后的完整列表，增量合并会让「删掉一条」永远删不掉
    const ipWhitelist = Array.from(new Set(body!.list));
    patchSecuritySettings({ ipWhitelist });

    return ok({ ipWhitelist }, { message: '白名单已更新' });
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

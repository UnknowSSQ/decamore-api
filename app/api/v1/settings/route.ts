import { defineRoute, ok } from '@/lib/server';
import { siteSettingsPatchSchema } from '@/lib/zod/admin.schema';
import { getSiteSettings, patchSiteSettings } from '@/lib/server/store/settings';
import { PERMISSIONS } from '@/constants/auth';

export const GET = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.settingsWrite,
    route: '/api/v1/settings',
  },
  () => {
    const settings = getSiteSettings();
    return ok(settings);
  },
);

export const PATCH = defineRoute(
  {
    auth: true,
    permission: PERMISSIONS.settingsWrite,
    body: siteSettingsPatchSchema,
    route: '/api/v1/settings',
  },
  async (_req, { body }) => {
    const updated = patchSiteSettings(body!);
    return ok(updated, { message: '网站设置已更新' });
  },
);

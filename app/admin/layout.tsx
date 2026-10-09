/**
 * guardPage() 在服务端鉴权，未登录跳 /login?redirect=…，AuthUser 以纯数据传给 Client Component。
 * metadata 用 absolute 覆盖根模板，控制台不带品牌后缀。
 */
import type { Metadata } from 'next';

import { ConsoleShell } from '@/components/console/ConsoleShell';
import { SiteDisplayProvider } from '@/hooks/useSiteFormat';
import { guardPage } from '@/lib/server/guards';
import { getSiteSettings } from '@/lib/server/mock/settings';

export const metadata: Metadata = {
  title: { absolute: '控制台 · Decamore API' },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await guardPage();
  const settings = getSiteSettings();

  return (
    <SiteDisplayProvider
      display={{
        timeZone: settings.timezone,
        dateFormat: settings.dateFormat,
        maintenanceMode: settings.maintenanceMode,
        itemsPerPage: settings.itemsPerPage,
      }}
    >
      <ConsoleShell user={user}>{children}</ConsoleShell>
    </SiteDisplayProvider>
  );
}

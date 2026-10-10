/** autoRefreshSec 要在这里下发给视图才真正生效，0 表示关闭轮询 */
import type { Metadata } from 'next';

import { DashboardView } from '@/components/console/dashboard/DashboardView';
import { getSiteSettings } from '@/lib/server/store/settings';

export const metadata: Metadata = {
  title: { absolute: '仪表盘 · 控制台 · Decamore API' },
};

export default function DashboardPage() {
  const { autoRefreshSec } = getSiteSettings();
  return <DashboardView autoRefreshSec={autoRefreshSec} />;
}

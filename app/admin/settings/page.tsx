import type { Metadata } from 'next';

import { SettingsView } from '@/components/console/views/settings/SettingsView';

export const metadata: Metadata = {
  title: '网站设置',
};

export default function Page() {
  return <SettingsView />;
}

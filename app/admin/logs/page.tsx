import type { Metadata } from 'next';

import { LogsView } from '@/components/console/views/logs/LogsView';

export const metadata: Metadata = {
  title: '调用日志',
};

export default function Page() {
  return <LogsView />;
}

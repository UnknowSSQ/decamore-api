import type { Metadata } from 'next';

import { SecurityView } from '@/components/console/views/security/SecurityView';

export const metadata: Metadata = {
  title: '安全配置',
};

export default function Page() {
  return <SecurityView />;
}

import type { Metadata } from 'next';

import { CardLayoutView } from '@/components/console/views/cards/CardLayoutView';

export const metadata: Metadata = {
  title: '卡片布局',
};

export default function Page() {
  return <CardLayoutView />;
}

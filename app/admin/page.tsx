import { redirect } from 'next/navigation';

import { ROUTES } from '@/constants/app';

export default function AdminPage() {
  redirect(ROUTES.adminDashboard);
}

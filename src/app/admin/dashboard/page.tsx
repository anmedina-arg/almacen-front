import { redirect } from 'next/navigation';
import { features } from '@/lib/features';
import { DashboardPanel } from '@/features/admin/components/dashboard/DashboardPanel';

export default function AdminDashboardPage() {
  if (!features.dashboard) redirect('/admin/products');
  return <DashboardPanel />;
}

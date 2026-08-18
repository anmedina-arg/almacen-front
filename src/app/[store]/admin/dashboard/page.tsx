import { redirect } from 'next/navigation';
import { features } from '@/lib/features';
import { DashboardPanel } from '@/features/admin/components/dashboard/DashboardPanel';

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  if (!features.dashboard) redirect(`/${store}/admin/products`);
  return <DashboardPanel />;
}

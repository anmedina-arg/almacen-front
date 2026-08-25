import { supabaseServer } from '@/lib/supabase/server';
import { requireFeatureFlag } from '@/lib/store/requireFeatureFlag';
import { DashboardPanel } from '@/features/admin/components/dashboard/DashboardPanel';

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  await requireFeatureFlag(supabaseServer, store, 'dashboard');
  return <DashboardPanel />;
}

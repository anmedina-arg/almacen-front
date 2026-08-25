import { supabaseServer } from '@/lib/supabase/server';
import { requireFeatureFlag } from '@/lib/store/requireFeatureFlag';
import { TopProductsTable } from '@/features/admin/components/ranking/TopProductsTable';

export default async function AdminRankingPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  await requireFeatureFlag(supabaseServer, store, 'ranking');
  return <TopProductsTable />;
}

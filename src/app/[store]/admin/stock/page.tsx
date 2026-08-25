import { supabaseServer } from '@/lib/supabase/server';
import { requireFeatureFlag } from '@/lib/store/requireFeatureFlag';
import { StockManagement } from '@/features/admin/components/stock/StockManagement';

export default async function AdminStockPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  await requireFeatureFlag(supabaseServer, store, 'stock');
  return <StockManagement />;
}

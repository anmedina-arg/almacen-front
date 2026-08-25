import { supabaseServer } from '@/lib/supabase/server';
import { requireFeatureFlag } from '@/lib/store/requireFeatureFlag';
import { InformesPanel } from '@/features/admin/components/informes/InformesPanel';

export default async function AdminInformesPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  await requireFeatureFlag(supabaseServer, store, 'informes');
  return <InformesPanel />;
}

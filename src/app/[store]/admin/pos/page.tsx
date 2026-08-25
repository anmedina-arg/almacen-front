import { Metadata } from 'next';
import { supabaseServer } from '@/lib/supabase/server';
import { requireFeatureFlag } from '@/lib/store/requireFeatureFlag';
import { POSView } from '@/features/admin/components/pos/POSView';

export const metadata: Metadata = {
  title: 'Punto de Venta — Admin',
};

export default async function POSPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  await requireFeatureFlag(supabaseServer, store, 'pos');
  return <POSView />;
}

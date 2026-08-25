import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { getStoreFeatureFlags } from '@/lib/store/getStoreFeatureFlags';

export default async function AdminRootPage({
  params,
}: {
  params: Promise<{ store: string }>;
}) {
  const { store } = await params;
  const flags = await getStoreFeatureFlags(supabaseServer, store);
  redirect(`/${store}${flags.dashboard ? '/admin/dashboard' : '/admin/products'}`);
}

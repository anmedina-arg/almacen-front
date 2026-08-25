import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getStoreFeatureFlags } from './getStoreFeatureFlags';
import type { FeatureFlagKey } from './featureFlags';

/**
 * Guard de página para rutas admin gateadas por flag (#23) — mismo patrón
 * que usaba /admin/dashboard con NEXT_PUBLIC_FEATURE_DASHBOARD, ahora
 * resuelto por Store vía stores.feature_flags en vez de un env var global.
 * Redirige a /admin/products (siempre encendida, nunca una flag) si la
 * feature está apagada para esta Store.
 */
export async function requireFeatureFlag(
  supabase: SupabaseClient,
  store: string,
  flag: FeatureFlagKey
): Promise<void> {
  const flags = await getStoreFeatureFlags(supabase, store);
  if (!flags[flag]) {
    redirect(`/${store}/admin/products`);
  }
}

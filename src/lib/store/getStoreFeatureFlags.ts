import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveFeatureFlags, type FeatureFlags } from './featureFlags';

/**
 * Resuelve las feature flags de una Store por slug (#23). Envuelta en
 * cache() (mismo patrón que getStoreBySlug/getStoreIdBySlug): dentro de un
 * mismo request, el layout de [store]/admin y cada page.tsx gateado llaman
 * esto con el mismo client (supabaseServer, singleton) y el mismo slug, así
 * que comparten una sola query.
 *
 * stores.feature_flags tiene lectura pública sin restricción (misma policy
 * "Anyone can read stores" que name/logo_url/whatsapp_number) — supabaseServer
 * (anon key, sin sesión) alcanza.
 */
export const getStoreFeatureFlags = cache(async (
  supabase: SupabaseClient,
  slug: string
): Promise<FeatureFlags> => {
  const { data } = await supabase
    .from('stores')
    .select('feature_flags')
    .eq('slug', slug)
    .maybeSingle();
  return resolveFeatureFlags(data?.feature_flags);
});

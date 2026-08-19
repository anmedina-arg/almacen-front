import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export type StoreBySlug = { id: number; name: string; logo_url: string | null };

/**
 * Resuelve id + name + logo_url de una Store por slug. Envuelta en cache()
 * (mismo patrón que getStoreIdBySlug/fetchCategoriesWithSubs): dentro de un
 * mismo request, generateMetadata y el layout de [store] llaman esto con el
 * mismo client (supabaseServer, singleton) y el mismo slug, así que
 * comparten una sola query en vez de resolver el mismo lookup dos veces.
 */
export const getStoreBySlug = cache(async (
  supabase: SupabaseClient,
  slug: string
): Promise<StoreBySlug | null> => {
  const { data } = await supabase
    .from('stores')
    .select('id, name, logo_url')
    .eq('slug', slug)
    .maybeSingle();
  return data ?? null;
});

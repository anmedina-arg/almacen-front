import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export type StoreBySlug = {
  id: number;
  name: string;
  logo_url: string | null;
  whatsapp_number: string | null;
  /** Demo Store (#153): el catálogo muestra la franja de demostración. */
  is_demo: boolean;
};

/**
 * Resuelve id + name + logo_url + whatsapp_number + is_demo de una Store por slug.
 * Envuelta en cache() (mismo patrón que getStoreIdBySlug/fetchCategoriesWithSubs):
 * dentro de un mismo request, generateMetadata y el layout de [store] llaman
 * esto con el mismo client (supabaseServer, singleton) y el mismo slug, así
 * que comparten una sola query en vez de resolver el mismo lookup dos veces.
 */
export const getStoreBySlug = cache(async (
  supabase: SupabaseClient,
  slug: string
): Promise<StoreBySlug | null> => {
  const { data, error } = await supabase
    .from('stores')
    .select('id, name, logo_url, whatsapp_number, is_demo')
    .eq('slug', slug)
    .maybeSingle();
  // Un error acá (ej. la columna is_demo todavía no aplicada en esa base)
  // haría que TODA Store diera 404: que al menos quede en los logs.
  if (error) console.error('[getStoreBySlug] stores:', error.message);
  return data ?? null;
});

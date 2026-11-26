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
 * Consulta una Store por slug. Devuelve null SOLO cuando la Store no existe;
 * si la consulta falla (base caída, columna faltante, timeout) tira error.
 * Antes ambos casos daban null y la Store entera respondía 404 (#190): un fallo
 * transitorio de la base se veía como "tienda no encontrada". Tirar permite que
 * unstable_cache no guarde nada y que el error boundary ofrezca reintentar.
 */
export async function lookupStoreBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<StoreBySlug | null> {
  const { data, error } = await supabase
    .from('stores')
    .select('id, name, logo_url, whatsapp_number, is_demo')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error(`[lookupStoreBySlug] stores: ${error.message}`);
  return data ?? null;
}

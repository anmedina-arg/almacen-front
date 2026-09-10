import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fetches the ids of the best-selling products over a 30-day window, used
 * for the "Más vendido" badge (#140, spec #139). Recibe el SupabaseClient
 * por parámetro — ver fetchProductMetadata.ts para el motivo.
 *
 * get_top_seller_ids scopeado por Store desde #142 — p_store_id requerido.
 */
export async function fetchTopSellerIds(supabase: SupabaseClient, storeId: number): Promise<Set<number>> {
  const { data, error } = await supabase.rpc('get_top_seller_ids', { p_days: 30, p_store_id: storeId });

  // Tira en vez de degradar acá (#147, code review — reemplaza la versión
  // anterior que devolvía un Set vacío en error): desde #147 esta pieza
  // SÍ queda envuelta en unstable_cache (getCachedTopSellerIds en
  // fetchPublicProducts.ts) con TTL de 24hs. Si degradara acá, un error
  // transitorio (incluido el mismatch de firma por deploy-ordering que
  // motivó el logueo explícito original, ver #142) quedaría cacheado
  // como "sin más vendidos" hasta por 24hs — un apagón total del badge
  // en toda la Store, no el desfasaje de datos que el ticket acepta
  // (dato viejo pero presente). El throw evita que unstable_cache
  // persista ese resultado malo; se degrada un nivel arriba, en el
  // caller, para no romper el catálogo por esto.
  if (error) throw new Error(`fetchTopSellerIds: ${error.message}`);

  return new Set<number>((data ?? []).map((r: { product_id: number }) => r.product_id));
}

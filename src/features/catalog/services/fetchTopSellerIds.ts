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

  // No se relanza: el badge "más vendido" es informativo, no crítico — un
  // fallo acá no debe tirar abajo el catálogo. Sí se loguea explícitamente
  // (a diferencia de antes de #142) porque, hasta que la firma nueva
  // (p_store_id) se aplique también en producción, un deploy de este
  // código antes que esa migración produce un mismatch de firma silencioso
  // sin esto — el badge desaparece sin ningún rastro en logs.
  if (error) {
    console.error('[fetchTopSellerIds] get_top_seller_ids RPC error:', error.message);
    return new Set<number>();
  }

  return new Set<number>((data ?? []).map((r: { product_id: number }) => r.product_id));
}

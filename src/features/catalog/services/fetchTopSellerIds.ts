import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fetches the ids of the best-selling products over a 30-day window, used
 * for the "Más vendido" badge (#140, spec #139). Recibe el SupabaseClient
 * por parámetro — ver fetchProductMetadata.ts para el motivo.
 *
 * get_top_seller_ids no filtra por Store todavía — depende de orders, que
 * #142 todavía no scopea. Fuera de alcance acá.
 */
export async function fetchTopSellerIds(supabase: SupabaseClient): Promise<Set<number>> {
  const { data } = await supabase.rpc('get_top_seller_ids', { p_days: 30 });

  return new Set<number>((data ?? []).map((r: { product_id: number }) => r.product_id));
}

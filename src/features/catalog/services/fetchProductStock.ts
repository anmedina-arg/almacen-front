import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fetches current stock quantities for every product of a Store, keyed by
 * product_id (#140, spec #139). Recibe el SupabaseClient por parámetro —
 * ver fetchProductMetadata.ts para el motivo.
 */
export async function fetchProductStock(supabase: SupabaseClient, storeId: number): Promise<Map<number, number>> {
  const { data } = await supabase.from('product_stock').select('product_id, quantity').eq('store_id', storeId);

  return new Map<number, number>((data ?? []).map((s) => [s.product_id, s.quantity]));
}

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Pedidos por Store para la pantalla del Platform admin (`/admin`, #151,
 * ADR-0015). Dominio Store/Platform — ver ADR-0013. Llama a la RPC
 * get_orders_count_by_store, que valida internamente que el usuario sea
 * `super_admin` (no depende de este service para autorizar).
 */

export interface StoreOrdersCount {
  storeId: number;
  storeSlug: string;
  storeName: string;
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  cancelledOrders: number;
}

interface StoreOrdersCountRow {
  store_id: number;
  store_slug: string;
  store_name: string;
  total_orders: number | string;
  pending_orders: number | string;
  confirmed_orders: number | string;
  cancelled_orders: number | string;
}

export async function getOrdersCountByStore(
  supabase: SupabaseClient
): Promise<StoreOrdersCount[]> {
  const { data, error } = await supabase.rpc('get_orders_count_by_store');

  if (error) throw new Error(error.message);

  // COUNT() es BIGINT; Number() normaliza por si PostgREST lo serializa como
  // string.
  return ((data ?? []) as StoreOrdersCountRow[]).map((row) => ({
    storeId: row.store_id,
    storeSlug: row.store_slug,
    storeName: row.store_name,
    totalOrders: Number(row.total_orders),
    pendingOrders: Number(row.pending_orders),
    confirmedOrders: Number(row.confirmed_orders),
    cancelledOrders: Number(row.cancelled_orders),
  }));
}

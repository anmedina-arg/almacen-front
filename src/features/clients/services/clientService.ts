import type { SupabaseClient } from '@supabase/supabase-js';
import type { Client } from '@/features/admin/types/client.types';

/**
 * Service del dominio Clients (#123) — ver ADR-0013, mismo patrón que
 * productService.ts/orderService.ts/stockService.ts. Dominio chico: solo
 * lectura acá — la asignación/desasignación de cliente a una orden vive en
 * features/orders/services/orderService.ts (#120, decisión explícita del
 * ticket: es un flujo de Orders, aunque toque la tabla clients).
 */
export async function getClients(supabase: SupabaseClient, storeId: number): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('id, barrio, manzana_lote, display_code, created_at')
    .eq('store_id', storeId)
    .order('barrio', { ascending: true })
    .order('manzana_lote', { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

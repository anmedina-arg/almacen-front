import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Costo de un Producto (#179, ticket #183, ADR-0018). Vive en `product_costs`,
 * una fila por producto y Store: sin fila es "sin costo registrado", nunca cero.
 * Solo lo ve y lo cambia el Store admin de esa Store (RLS). Cada función recibe
 * storeId explícito, como el resto del dominio Products (ADR-0013).
 */

/** Costos registrados de la Store, por id de producto. Los productos sin costo no aparecen. */
export async function listProductCosts(supabase: SupabaseClient, storeId: number): Promise<Map<number, number>> {
  const { data, error } = await supabase.from('product_costs').select('product_id, cost').eq('store_id', storeId);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((row) => [row.product_id as number, Number(row.cost)]));
}

/**
 * Registra el costo de un producto (`number`, incluido 0 a propósito) o lo quita
 * (`null`: vuelve a "sin costo registrado"). Quien llama ya resolvió que la flag
 * `costos` está encendida: con la flag apagada no se escribe costo.
 */
export async function setProductCost(
  supabase: SupabaseClient,
  storeId: number,
  productId: number,
  cost: number | null
): Promise<void> {
  if (cost === null) {
    const { error } = await supabase.from('product_costs').delete().eq('product_id', productId).eq('store_id', storeId);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase
    .from('product_costs')
    .upsert({ product_id: productId, store_id: storeId, cost }, { onConflict: 'product_id,store_id' });
  if (error) throw new Error(error.message);
}

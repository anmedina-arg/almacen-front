import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Máximo de stock de un Producto (#179, ticket #184, ADR-0012). Es un atributo del
 * módulo `stock`: vive en `product_stock.max_stock`, junto con el stock real. Solo
 * lo usan los combos, como tope del Disponible que muestran /admin/stock y el CSV.
 * Cada función recibe storeId explícito, como el resto del dominio Products (ADR-0013).
 */

/** Máximos cargados de la Store, por id de producto. Los productos sin máximo no aparecen. */
export async function listProductMaxStocks(supabase: SupabaseClient, storeId: number): Promise<Map<number, number>> {
  const { data, error } = await supabase
    .from('product_stock')
    .select('product_id, max_stock')
    .eq('store_id', storeId)
    .not('max_stock', 'is', null);
  if (error) throw new Error(error.message);
  return new Map((data ?? []).map((row) => [row.product_id as number, Number(row.max_stock)]));
}

/**
 * Guarda el máximo de un producto (`number`) o lo quita (`null`). Quien llama ya
 * resolvió que la flag `stock` está encendida: con la flag apagada no se escribe.
 * Guardar crea la fila de stock con cantidad 0 si falta (un combo no tiene stock
 * propio); quitar nunca crea una fila ni toca la cantidad.
 */
export async function setProductMaxStock(
  supabase: SupabaseClient,
  storeId: number,
  productId: number,
  maxStock: number | null
): Promise<void> {
  if (maxStock === null) {
    const { error } = await supabase
      .from('product_stock')
      .update({ max_stock: null })
      .eq('product_id', productId)
      .eq('store_id', storeId);
    if (error) throw new Error(error.message);
    return;
  }
  // El upsert solo escribe las columnas que se mandan: una fila existente conserva su cantidad.
  const { error } = await supabase
    .from('product_stock')
    .upsert({ product_id: productId, store_id: storeId, max_stock: maxStock }, { onConflict: 'product_id' });
  if (error) throw new Error(error.message);
}

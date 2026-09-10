import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fetches the current stock quantity for a single product (#146, spec
 * #139) — reemplaza el fetch bulk de toda la Store (#140) para poder
 * cachear/invalidar por producto en vez de forzar el recálculo de los
 * ~550 productos del catálogo por cada pedido/ajuste de uno solo (ver
 * getCachedProductStock en fetchPublicProducts.ts).
 *
 * undefined = sin fila en product_stock — puede ser un producto sin
 * tracking de stock (is_stock_tracked = false, ADR-0012) o un combo (su
 * stock es virtual, derivado de los componentes, no tiene fila propia).
 * Ambos casos ya se trataban como "sin registro, tratar como disponible"
 * antes de #146 (ver Product.stock_quantity).
 */
export async function fetchProductStockForProduct(
  supabase: SupabaseClient,
  storeId: number,
  productId: number
): Promise<number | undefined> {
  const { data, error } = await supabase
    .from('product_stock')
    .select('quantity')
    .eq('store_id', storeId)
    .eq('product_id', productId)
    .maybeSingle();

  // Tira en vez de devolver undefined en error (#146, mismo criterio que
  // fetchProductMetadata.ts #145): con cache indefinido, undefined
  // cacheado por un error transitorio se leería como "disponible" hasta
  // la próxima venta/ajuste de ESE producto puntual — se degrada un nivel
  // arriba (getCachedProductStock), no acá.
  if (error) throw new Error(`fetchProductStockForProduct: ${error.message}`);

  return data?.quantity ?? undefined;
}

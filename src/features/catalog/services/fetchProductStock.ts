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

/**
 * Trae el stock de TODOS los productos de una Store en una sola query
 * (#148) — usado por fetchPublicProducts.ts únicamente para catalog_ssr/
 * catalog_admin_fetch (sin categoryId ni search, ver getStockForProducts),
 * es decir, cuando el resultado de metadata es el catálogo completo (del
 * orden de ~550 productos). Reemplaza en ESE caso puntual las N llamadas
 * individuales a getCachedProductStock (#146) — perf_logs en producción
 * confirmó que esas N llamadas a unstable_cache, acotadas por
 * STOCK_FETCH_CONCURRENCY, dejaban catalog_ssr más lento que antes de
 * #146 (~1500ms vs ~900ms), no más rápido: el overhead de cientos de
 * lecturas de cache serializadas en tandas superaba el costo de un único
 * roundtrip bulk.
 *
 * A propósito SIN cache (unstable_cache): cachear este resultado como una
 * sola entrada reintroduciría el problema de blast-radius que #146 vino a
 * resolver (un pedido de un solo producto invalidaría el stock mostrado
 * para los ~550 productos del catálogo hasta la próxima revalidación). Se
 * prefiere pagar un query bulk fresco por request (rápido, un solo
 * roundtrip) antes que cachear con esa granularidad gruesa. Los casos
 * filtrados (búsqueda, paginación por categoría — resultado chico) siguen
 * usando el cache per-producto de getCachedProductStock, donde sí vale la
 * pena.
 */
export async function fetchProductStockBulk(
  supabase: SupabaseClient,
  storeId: number
): Promise<Map<number, number>> {
  const { data, error } = await supabase.from('product_stock').select('product_id, quantity').eq('store_id', storeId);

  // Mismo criterio que fetchProductStockForProduct: tira en vez de degradar
  // acá, para no persistir un resultado malo en ningún cache — este helper
  // no cachea, pero el caller (getStockForProducts en fetchPublicProducts.ts)
  // sí degrada a un Map vacío, mismo patrón que las piezas hermanas.
  if (error) throw new Error(`fetchProductStockBulk: ${error.message}`);

  return new Map((data ?? []).map((row) => [row.product_id as number, row.quantity as number]));
}

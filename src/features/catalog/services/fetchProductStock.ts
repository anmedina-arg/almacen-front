import type { SupabaseClient } from '@supabase/supabase-js';

interface AvailableStockRow {
  product_id: number;
  available: number;
}

/**
 * Trae el Disponible (ver CONTEXT.md) vía get_available_stock() (#159,
 * spec #157) — la misma regla para los dos caminos de abajo, y la que #160
 * va a usar al registrar el pedido. Sin Control de stock la función no
 * devuelve filas, así que el Map queda vacío y el catálogo ve `undefined`
 * para todo producto (sin límite, ver Product.stock_quantity).
 *
 * Tira en vez de devolver vacío en error (#146, mismo criterio que
 * fetchProductMetadata.ts #145): con cache indefinido, un vacío cacheado por
 * un error transitorio se leería como "sin Control de stock" hasta el
 * próximo cambio de stock de ese producto — se degrada un nivel arriba
 * (getCachedProductStock/getStockForProducts en fetchPublicProducts.ts),
 * no acá.
 */
async function fetchAvailableStock(
  supabase: SupabaseClient,
  storeId: number,
  productIds: number[] | null,
  label: string
): Promise<Map<number, number>> {
  const { data, error } = await supabase.rpc('get_available_stock', {
    p_store_id: storeId,
    p_product_ids: productIds,
  });

  if (error) throw new Error(`${label}: ${error.message}`);

  return new Map(((data ?? []) as AvailableStockRow[]).map((row) => [row.product_id, Number(row.available)]));
}

/**
 * Disponible de un solo producto (#146, spec #139) — para cachear/invalidar
 * por producto en vez de forzar el recálculo de los ~550 productos del
 * catálogo por cada pedido/ajuste de uno solo (ver getCachedProductStock en
 * fetchPublicProducts.ts). Un combo depende del stock de sus componentes:
 * su tag se invalida cuando cambia el de cualquiera de ellos (#158, ver
 * invalidateProductStock.ts).
 *
 * undefined = la Store no lleva Control de stock (#159). Antes significaba
 * "sin fila en product_stock" (producto sin cargar o combo); con Control de
 * stock eso ahora es un número: 0 sin fila, combos completos para un combo.
 * También da undefined un producto inactivo pedido por un visitante
 * anónimo (la RLS de products no se lo deja ver) — el catálogo público no
 * muestra inactivos, y el fetch de admin corre con sesión de Store admin.
 */
export async function fetchProductStockForProduct(
  supabase: SupabaseClient,
  storeId: number,
  productId: number
): Promise<number | undefined> {
  const stock = await fetchAvailableStock(supabase, storeId, [productId], 'fetchProductStockForProduct');
  return stock.get(productId);
}

/**
 * Disponible de TODOS los productos de una Store en un solo roundtrip
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
  return fetchAvailableStock(supabase, storeId, null, 'fetchProductStockBulk');
}

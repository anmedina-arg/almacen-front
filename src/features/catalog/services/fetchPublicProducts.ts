import 'server-only';
import { unstable_cache } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logPerf } from '@/lib/observability/logPerf';
import { productMetadataTag, productStockTag } from '@/lib/cache/tags';
import { mapWithConcurrencyLimit } from '@/lib/concurrency';
import type { Product } from '@/types';
import { fetchProductMetadata, type FetchProductMetadataOptions } from './fetchProductMetadata';
import { fetchProductStockForProduct } from './fetchProductStock';
import { fetchTopSellerIds } from './fetchTopSellerIds';

// Tope de queries de stock simultáneas por request (#146) — arbitrario
// pero conservador; ajustar si el timing post-deploy (perf_logs) muestra
// que es cuello de botella en cold cache.
const STOCK_FETCH_CONCURRENCY = 25;

/**
 * Cache de metadata de producto (#145, spec #139, ADR-0014) — vida larga
 * (sin revalidate por tiempo), invalidada solo por evento
 * (revalidateTag(productMetadataTag(storeId)) en los endpoints de
 * edición de producto/combo, ver createProduct/updateProduct/
 * deleteProduct/updateComboComponents).
 *
 * La búsqueda queda afuera a propósito: cachear por string de búsqueda
 * tiene mal hit-rate (cada visitante escribe algo distinto) y el cache
 * crecería sin límite con entradas que casi nunca se reusan — sigue
 * pegándole a la base en cada tecla, igual que antes de #145.
 *
 * Trade-off aceptado (code review de #145): unstable_cache no dedupea
 * misses concurrentes — justo después de un revalidateTag, varios
 * requests en simultáneo pueden pegarle a la base a la vez con la misma
 * query en vez de que uno la resuelva y el resto espere ese resultado.
 * Mitigarlo (lock/coalescing) no resuelve del todo en serverless (cada
 * invocación puede vivir en una instancia distinta) y agrega complejidad
 * real — se acepta el pico breve de carga justo tras una edición en vez
 * de resolverlo acá.
 */
function getCachedProductMetadata(
  supabase: SupabaseClient,
  storeId: number,
  options?: FetchProductMetadataOptions
): Promise<Product[]> {
  // El throw de fetchProductMetadata en error (ver ese archivo) es lo que
  // evita que unstable_cache persista un resultado malo en un miss — pero
  // dejar que ese throw se propague tal cual hasta acá tira abajo toda la
  // página (Header/Footer incluidos, sin error boundary en
  // ProductCatalogLoader), peor que el bug que se quería resolver
  // (2da pasada de code review de #145). Se ataja acá, después de que
  // unstable_cache ya vio el rechazo — el catálogo degrada a "sin
  // productos" como cualquiera de las piezas hermanas (stock, top-seller,
  // categorías), no como una página rota.
  const metadataPromise = options?.search
    ? fetchProductMetadata(supabase, storeId, options)
    : unstable_cache(
        () => fetchProductMetadata(supabase, storeId, options),
        ['product-metadata', String(storeId), String(options?.categoryId ?? ''), String(options?.includeInactive ?? false)],
        { tags: [productMetadataTag(storeId)] }
      )();

  return metadataPromise.catch((err) => {
    console.error('[getCachedProductMetadata] error:', err instanceof Error ? err.message : err);
    return [];
  });
}

/**
 * Cache de stock por producto (#146, spec #139, ADR-0014) — a propósito
 * una entrada de cache por producto, no una sola para toda la Store: un
 * pedido o ajuste de stock de un producto invalida solo su propio tag
 * (productStockTag), el resto de los ~550 productos del catálogo sigue
 * sirviéndose de cache sin recalcularse. Mismo criterio de degradado que
 * getCachedProductMetadata: fetchProductStockForProduct tira en error (no
 * cachea un resultado malo), se ataja acá para no romper la página —
 * degradar a undefined es seguro porque el catálogo ya trata "sin
 * registro de stock" como "disponible" (ver Product.stock_quantity).
 */
function getCachedProductStock(
  supabase: SupabaseClient,
  storeId: number,
  productId: number
): Promise<number | undefined> {
  const cached = unstable_cache(
    () => fetchProductStockForProduct(supabase, storeId, productId),
    ['product-stock', String(storeId), String(productId)],
    { tags: [productStockTag(storeId, productId)] }
  );
  return cached().catch((err) => {
    console.error('[getCachedProductStock] error:', err instanceof Error ? err.message : err);
    return undefined;
  });
}

/**
 * Fetches products with stock and combo items, scoped to a single Store.
 * Server-only — do not import from client components.
 *
 * Orquesta las 3 piezas independientes (metadata / stock / top-seller,
 * #140, spec #139) y arma el mismo Product[] que antes traía todo junto —
 * sin cambio de comportamiento observable. Cada pieza recibe el
 * SupabaseClient por parámetro; este orquestador es el único punto que
 * sigue creando el cliente cookie-based (por eso queda sin test de
 * integración automatizado, igual que verifyStoreAdminAuth — no se puede
 * invocar fuera de un request real de Next.js; se verifica con smoke test
 * manual).
 *
 * @param storeId - Store a la que se filtra el catálogo. Requerido: sin esto,
 *   el catálogo de una Store mostraría productos de todas las demás (#15).
 * @param options.includeInactive - When true, returns all products (active + inactive).
 *   The caller is responsible for verifying admin access before passing this flag.
 * @param options.categoryId - When provided, returns only products of that category.
 *   Used by SSR and the catalog infinite query to load one category at a time.
 */
export async function fetchPublicProducts(
  storeId: number,
  options?: FetchProductMetadataOptions
): Promise<Product[]> {
  const startedAt = Date.now();
  // Instrumentación temporal (#141, spec #139) para medir el impacto real
  // de #145/#146/#147. 4 buckets, no 2 — este mismo caller sirve tanto la
  // carga SSR inicial (sin filtros) como los fetches del cliente que pegan
  // acá por otras razones (paginar por categoría, o el fetch de admin con
  // includeInactive) — mezclarlos diluiría la comparación antes/después
  // (hallazgo de code review de #141).
  // includeInactive va primero: identifica tráfico de admin sin importar si
  // además pasa search — evita que un futuro caller admin con búsqueda
  // contamine el bucket catalog_search, que tiene que quedar puro
  // tráfico público (segundo hallazgo de la 2da pasada de code review).
  const route = options?.includeInactive
    ? 'catalog_admin_fetch'
    : options?.search
      ? 'catalog_search'
      : options?.categoryId != null
        ? 'catalog_category_pagination'
        : 'catalog_ssr';

  const supabase = await createSupabaseServerClient();

  try {
    const metadata = await getCachedProductMetadata(supabase, storeId, options);

    // Corta antes de tocar stock/top-seller si la Store no tiene productos
    // — mismo criterio que la versión pre-split, que evitaba los dos
    // roundtrips extra cuando no hay nada que enriquecer. metadata=[] acá
    // puede ser una Store genuinamente sin productos O un error de
    // fetchProductMetadata ya degradado a [] por getCachedProductMetadata
    // (3ra pasada de code review de #145) — ambos casos se tratan igual
    // a propósito, mismo criterio que las piezas hermanas (stock,
    // top-seller): degradar en vez de romper la página.
    if (metadata.length === 0) return [];

    // Un fetch cacheado por producto en vez de un solo fetch bulk (#146)
    // — cada uno resuelve de cache o de la base según corresponda de
    // forma independiente. Con límite de concurrencia (no un Promise.all
    // sin tope, hallazgo de code review): un catálogo de ~550 productos
    // con cache frío (deploy reciente, primera visita tras invalidar)
    // podría disparar 550 queries simultáneas a Supabase en un solo page
    // load si no se acota.
    const [stockEntries, topSellerIds] = await Promise.all([
      mapWithConcurrencyLimit(
        metadata,
        STOCK_FETCH_CONCURRENCY,
        async (p) => [p.id, await getCachedProductStock(supabase, storeId, p.id)] as const
      ),
      fetchTopSellerIds(supabase, storeId),
    ]);
    const stockMap = new Map(stockEntries);

    return metadata.map((p) => ({
      ...p,
      // stockMap tiene una entrada para cada producto de metadata siempre
      // (#146 — antes stockMap.has() podía ser false para un producto sin
      // fila en product_stock; ahora esa entrada existe igual, con
      // valor undefined).
      stock_quantity: stockMap.get(p.id),
      is_top_seller: topSellerIds.has(p.id),
    }));
  } finally {
    logPerf(supabase, route, Date.now() - startedAt, storeId);
  }
}

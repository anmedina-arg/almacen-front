import 'server-only';
import { unstable_cache } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logPerf } from '@/lib/observability/logPerf';
import { productMetadataTag, productStockTag } from '@/lib/cache/tags';
import { TOP_SELLER_CACHE_SECONDS } from '@/lib/cache/ttl';
import { mapWithConcurrencyLimit } from '@/lib/concurrency';
import type { Product } from '@/types';
import { fetchProductMetadata, type FetchProductMetadataOptions } from './fetchProductMetadata';
import { fetchProductStockBulk, fetchProductStockForProduct } from './fetchProductStock';
import { fetchTopSellerIds } from './fetchTopSellerIds';

// Tope de queries de stock simultáneas por request (#146) — solo aplica a
// la rama filtrada de getStockForProducts (búsqueda/paginación por
// categoría, resultado chico). El timing post-deploy en perf_logs
// terminó confirmando que era cuello de botella, pero no en cold cache
// como se esperaba acá: para el catálogo completo (sin filtros, ~550
// productos) el overhead era de las llamadas a unstable_cache en sí,
// cache-hit o no — resuelto en #148 sacando esa rama del cache per-producto
// (ver getStockForProducts). Este límite se mantiene para cuando el
// resultado SÍ es chico, donde el riesgo real de #146 (cold cache, muchos
// productos a la vez) sigue vigente si la Store tiene una categoría grande.
const STOCK_FETCH_CONCURRENCY = 25;

/**
 * Loguea y degrada a `fallback` si `promise` rechaza — patrón compartido
 * por las 3 piezas cacheadas de este archivo (metadata #145, stock #146,
 * top-seller #147): cada una tira en error para que unstable_cache no
 * persista un resultado malo, y esto es lo que evita que ese throw rompa
 * la página completa en vez de degradar. Extraído como helper en la 2da
 * pasada de code review de #147, tras repetirse igual 3 veces.
 */
function degradeOnError<T>(promise: Promise<T>, label: string, fallback: T): Promise<T> {
  return promise.catch((err) => {
    console.error(`[${label}] error:`, err instanceof Error ? err.message : err);
    return fallback;
  });
}

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

  return degradeOnError(metadataPromise, 'getCachedProductMetadata', [] as Product[]);
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
  return degradeOnError(cached(), 'getCachedProductStock', undefined);
}

/**
 * `true` cuando `metadata` es el catálogo completo de la Store, sin
 * recortar por búsqueda ni por categoría (#148) — el caso que en
 * producción resultó ~550 productos, y donde el cache per-producto de
 * getCachedProductStock resultaba más lento que no cachear. `includeInactive`
 * no entra en la cuenta: catalog_admin_fetch también trae todo sin filtro,
 * mismo tamaño de problema que catalog_ssr.
 */
function isFullCatalogFetch(options?: FetchProductMetadataOptions): boolean {
  return !options?.search && options?.categoryId == null;
}

/**
 * Un solo reintento inmediato para el query bulk (#148, code review) — a
 * diferencia del cache per-producto, acá UN query fallido degradaría el
 * stock de los ~550 productos del catálogo a "disponible" de una sola vez
 * en vez de solo el de un producto puntual. Un blip transitorio de
 * Supabase no debería pagar ese costo cuando un reintento simple ya lo
 * resuelve la mayoría de las veces. Para una falla persistente (no
 * transitoria) el degradado sigue siendo a "disponible" para todos —
 * aceptado porque create_order() es la fuente de verdad real al
 * confirmar (rechaza si el stock real no alcanza, ver CONTEXT.md): esto
 * no arriesga overselling, solo una mala UX puntual (checkouts
 * rechazados) durante una caída real y sostenida.
 */
async function fetchStockBulkWithRetry(supabase: SupabaseClient, storeId: number): Promise<Map<number, number>> {
  try {
    return await fetchProductStockBulk(supabase, storeId);
  } catch {
    return fetchProductStockBulk(supabase, storeId);
  }
}

/**
 * Resuelve el stock de `metadata` con una de dos estrategias (#148, spec
 * #139, ADR-0014):
 *
 * - Catálogo completo (isFullCatalogFetch): un único query bulk
 *   (fetchProductStockBulk), sin unstable_cache — ver ese archivo para el
 *   razonamiento completo. Perf_logs en producción mostró que cachear acá
 *   por producto (#146) dejaba catalog_ssr más lento que antes de esa
 *   cache, no más rápido.
 * - Resultado filtrado (búsqueda o paginación por categoría): mantiene el
 *   cache per-producto de #146 sin cambios — el resultado es chico, ahí
 *   sí gana invalidación granular sin pagar overhead de cientos de
 *   lecturas de cache.
 */
function getStockForProducts(
  supabase: SupabaseClient,
  storeId: number,
  metadata: Product[],
  options?: FetchProductMetadataOptions
): Promise<Map<number, number | undefined>> {
  if (isFullCatalogFetch(options)) {
    return degradeOnError(fetchStockBulkWithRetry(supabase, storeId), 'getStockForProducts:bulk', new Map<number, number>()).then(
      (bulk) => new Map(metadata.map((p) => [p.id, bulk.get(p.id)]))
    );
  }

  // Con límite de concurrencia (no un Promise.all sin tope, hallazgo de
  // code review de #146): una categoría o búsqueda con muchos resultados
  // en cold cache podría disparar muchas queries simultáneas a Supabase
  // en un solo page load si no se acota.
  return mapWithConcurrencyLimit(
    metadata,
    STOCK_FETCH_CONCURRENCY,
    async (p) => [p.id, await getCachedProductStock(supabase, storeId, p.id)] as const
  ).then((entries) => new Map(entries));
}

/**
 * Cache diario del badge "más vendido" (#147, spec #139, ADR-0014) — a
 * diferencia de metadata/stock, sin invalidación por evento: solo
 * `revalidate` por tiempo (TOP_SELLER_CACHE_SECONDS), ningún pedido lo
 * toca. Se acepta hasta 24hs de desfasaje a propósito — es un dato
 * informativo sobre una ventana de 30 días, no necesita estar al minuto
 * (ver fetchTopSellerIds.ts).
 *
 * unstable_cache serializa el resultado (JSON) — un Set no sobrevive esa
 * vuelta, por eso se cachea el array (fetchTopSellerIds ya lo devuelve
 * como Set, sin cambios: se convierte acá en la frontera del cache, no en
 * fetchTopSellerIds.ts, para no tocar su contrato ni el test existente).
 *
 * fetchTopSellerIds tira en error (#147, code review — antes degradaba
 * ahí mismo a un Set vacío) para que unstable_cache no persista ese
 * resultado malo: si degradara adentro, un error transitorio quedaría
 * cacheado como "sin más vendidos" hasta por 24hs — un apagón total del
 * badge en toda la Store, no el desfasaje de datos (dato viejo pero
 * presente) que el ticket acepta. Se degrada acá, en el caller, para que
 * el catálogo no se rompa por esto — mismo criterio que metadata/stock.
 */
function getCachedTopSellerIds(supabase: SupabaseClient, storeId: number): Promise<Set<number>> {
  const cached = unstable_cache(
    async () => Array.from(await fetchTopSellerIds(supabase, storeId)),
    ['top-seller-ids', String(storeId)],
    { revalidate: TOP_SELLER_CACHE_SECONDS }
  );
  return degradeOnError(
    cached().then((ids) => new Set(ids)),
    'getCachedTopSellerIds',
    new Set<number>()
  );
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

    // getStockForProducts elige bulk vs. cache per-producto según el
    // tamaño del resultado (#148 — ver esa función para el razonamiento).
    const [stockMap, topSellerIds] = await Promise.all([
      getStockForProducts(supabase, storeId, metadata, options),
      getCachedTopSellerIds(supabase, storeId),
    ]);

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

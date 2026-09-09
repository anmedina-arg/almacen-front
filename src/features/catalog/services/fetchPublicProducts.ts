import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { logPerf } from '@/lib/observability/logPerf';
import type { Product } from '@/types';
import { fetchProductMetadata } from './fetchProductMetadata';
import { fetchProductStock } from './fetchProductStock';
import { fetchTopSellerIds } from './fetchTopSellerIds';

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
  options?: {
    includeInactive?: boolean;
    categoryId?: number;
    search?: string;
  }
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
    const metadata = await fetchProductMetadata(supabase, storeId, options);

    // Corta antes de tocar stock/top-seller si la Store no tiene productos
    // (o la query principal falló — fetchProductMetadata devuelve [] en
    // ambos casos) — mismo criterio que la versión pre-split, que evitaba
    // los dos roundtrips extra cuando no hay nada que enriquecer.
    if (metadata.length === 0) return [];

    const [stockMap, topSellerIds] = await Promise.all([
      fetchProductStock(supabase, storeId),
      fetchTopSellerIds(supabase, storeId),
    ]);

    return metadata.map((p) => ({
      ...p,
      stock_quantity: stockMap.has(p.id) ? stockMap.get(p.id) : undefined,
      is_top_seller: topSellerIds.has(p.id),
    }));
  } finally {
    logPerf(supabase, route, Date.now() - startedAt, storeId);
  }
}

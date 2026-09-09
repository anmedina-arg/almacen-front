import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase/server';
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
  const supabase = await createSupabaseServerClient();

  const metadata = await fetchProductMetadata(supabase, storeId, options);

  // Corta antes de tocar stock/top-seller si la Store no tiene productos
  // (o la query principal falló — fetchProductMetadata devuelve [] en
  // ambos casos) — mismo criterio que la versión pre-split, que evitaba
  // los dos roundtrips extra (incluida la RPC de top-seller, que cruza
  // todas las Stores) cuando no hay nada que enriquecer.
  if (metadata.length === 0) return [];

  const [stockMap, topSellerIds] = await Promise.all([
    fetchProductStock(supabase, storeId),
    fetchTopSellerIds(supabase),
  ]);

  return metadata.map((p) => ({
    ...p,
    stock_quantity: stockMap.has(p.id) ? stockMap.get(p.id) : undefined,
    is_top_seller: topSellerIds.has(p.id),
  }));
}

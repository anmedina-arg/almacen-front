import type { SupabaseClient } from '@supabase/supabase-js';
import type { Product } from '@/types';

/** Compartido con fetchPublicProducts.ts (#145, code review) — una sola
 * definición para no arriesgar que las 3 copias (acá, fetchPublicProducts,
 * y su cache wrapper) se desincronicen. */
export type FetchProductMetadataOptions = {
  includeInactive?: boolean;
  categoryId?: number;
  search?: string;
};

function formatComboItem(rawName: string, qty: number, saleType: string): string {
  const name = rawName
    .replace(/\b100\s*gr\b/gi, '')
    .replace(/\bkilos?\b/gi, '')
    .replace(/\bkg\b/gi, '')
    .replace(/\bx\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  let qtyLabel: string;
  if (saleType === 'kg' || saleType === '100gr') {
    if (qty < 1) {
      qtyLabel = `${Math.round(qty * 1000)} gr`;
    } else {
      qtyLabel = `${parseFloat(qty.toFixed(3))} kg`;
    }
  } else {
    const n = parseFloat(qty.toFixed(10));
    qtyLabel = Number.isInteger(n) ? String(n) : String(parseFloat(n.toPrecision(6)));
  }

  return `${qtyLabel} ${name}`;
}

/**
 * Fetches product metadata (name, price, category, subcategory, combo
 * composition) for a Store — sin stock ni flag de "más vendido", ver
 * fetchProductStock.ts / fetchTopSellerIds.ts (#140, spec #139).
 *
 * Recibe el SupabaseClient por parámetro (no lo crea internamente) para ser
 * testeable fuera de un request de Next.js — mismo patrón que
 * resolveStoreAdminStatus en roleHelpers.ts.
 *
 * @param storeId - Store a la que se filtra el catálogo. Requerido: sin esto,
 *   el catálogo de una Store mostraría productos de todas las demás (#15).
 * @param options.includeInactive - When true, returns all products (active + inactive).
 *   The caller is responsible for verifying admin access before passing this flag.
 * @param options.categoryId - When provided, returns only products of that category.
 *   Used by SSR and the catalog infinite query to load one category at a time.
 * @throws Si la query principal de productos falla (#145) — a propósito,
 *   para que un caller que envuelva esto en cache (getCachedProductMetadata
 *   en fetchPublicProducts.ts) no persista un resultado malo. Un caller
 *   directo nuevo (test, script) que asuma "en el peor caso devuelve []"
 *   se va a encontrar con un throw en vez de eso — no es el contrato
 *   pre-#145.
 */
export async function fetchProductMetadata(
  supabase: SupabaseClient,
  storeId: number,
  options?: FetchProductMetadataOptions
): Promise<Product[]> {
  let query = supabase
    .from('products')
    .select(
      `
      id,
      name,
      price,
      cost,
      image,
      active,
      categories,
      mainCategory:main_category,
      sale_type,
      is_combo,
      max_stock,
      category_id,
      subcategory_id,
      is_producto_surtido,
      familia_id,
      min_variedades,
      max_variedades,
      cat:categories!products_category_id_fkey(id, name),
      sub:subcategories!products_subcategory_id_fkey(id, name)
    `
    )
    .eq('store_id', storeId)
    .order('name', { ascending: true });

  if (!options?.includeInactive) {
    query = query.eq('active', true);
  }

  if (options?.categoryId != null) {
    query = query.eq('category_id', options.categoryId);
  }

  if (options?.search) {
    query = query.ilike('name', `%${options.search}%`);
  }

  const { data, error } = await query;

  // Tira en vez de devolver [] en error (#145, code review): antes de
  // cachear esto (ver getCachedProductMetadata en fetchPublicProducts.ts),
  // un error transitorio silenciado como "catálogo vacío" duraba un solo
  // request. Con cache indefinido (sin TTL, solo invalidación por evento),
  // devolver [] acá lo cachearía como si la Store no tuviera productos
  // hasta el próximo alta/edición/borrado — un blip de red podría vaciar
  // el catálogo público hasta que alguien del admin edite algo, sin
  // relación. Un throw evita que unstable_cache guarde nada en un miss
  // fallido, así que el próximo request reintenta en vez de arrastrar el
  // error cacheado. "Sin datos" (data null/undefined sin error) sigue
  // siendo un catálogo vacío legítimo, no un error.
  if (error) throw new Error(`fetchProductMetadata: ${error.message}`);
  if (!data) return [];

  const comboIds = data.filter((p) => p.is_combo).map((p) => p.id);

  const comboResult =
    comboIds.length > 0
      ? await supabase
          .from('combo_components')
          .select(`combo_product_id, quantity, products!combo_components_component_product_id_fkey(name, sale_type)`)
          .in('combo_product_id', comboIds)
          .order('id', { ascending: true })
      : { data: [] as { combo_product_id: number; quantity: number; products: unknown }[], error: null };

  // A diferencia del error de arriba, este NO tira (3ra pasada de code
  // review de #145): fallar acá solo degradaría los combos a "sin
  // componentes listados" — cosmético, el resto del catálogo sigue
  // siendo válido. Tirar acumularía blast radius de más: vaciaría TODO
  // el catálogo (vía degradeOnError en fetchPublicProducts.ts) por un
  // error acotado a un sub-query de combos. Sí puede quedar cacheado con
  // combo_items vacíos hasta la próxima invalidación por evento — trade-off
  // aceptado, es el mismo riesgo que ya existía antes de #145 para este
  // caso puntual, solo que ahora con TTL indefinido en vez de un request.
  if (comboResult.error) {
    console.error('[fetchProductMetadata] combo_components error:', comboResult.error.message);
  }
  const comboData = comboResult.data;

  const comboItemsMap = new Map<number, string[]>();
  (comboData ?? []).forEach((row) => {
    const prod = row.products as unknown as { name: string; sale_type: string } | null;
    if (!comboItemsMap.has(row.combo_product_id)) comboItemsMap.set(row.combo_product_id, []);
    if (prod) {
      comboItemsMap
        .get(row.combo_product_id)!
        .push(formatComboItem(prod.name, parseFloat(String(row.quantity)), prod.sale_type));
    }
  });

  return data.map((p) => {
    const { cat, sub, ...rest } = p as typeof p & {
      cat?: { id: number; name: string } | null;
      sub?: { id: number; name: string } | null;
    };
    return {
      ...rest,
      category_name: cat?.name ?? null,
      subcategory_name: sub?.name ?? null,
      ...(p.is_combo ? { combo_items: comboItemsMap.get(p.id) ?? [] } : {}),
    } as Product;
  });
}

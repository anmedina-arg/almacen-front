import type { SupabaseClient } from '@supabase/supabase-js';
import type { RecommendedProduct } from '@/features/catalog/types/recommendation.types';

/**
 * Service del dominio Recomendaciones/Informes (#125) — ver ADR-0013,
 * dominio delgado "reporting" (sin tabla propia). Agrega datos de
 * Orders/Products vía las funciones RPC existentes.
 */

export interface GetRecommendationsParams {
  productIds: number[];
  excludeIds: number[];
  limit: number;
}

export async function getRecommendations(
  supabase: SupabaseClient,
  storeId: number,
  params: GetRecommendationsParams
): Promise<RecommendedProduct[]> {
  if (params.productIds.length === 0) return [];

  const { data: rpcData, error: rpcError } = await supabase.rpc('get_recommendations', {
    p_product_ids: params.productIds,
    p_exclude_ids: params.excludeIds.length > 0 ? params.excludeIds : [],
    p_limit: params.limit,
    p_store_id: storeId,
  });

  if (rpcError) throw new Error(rpcError.message);
  if (!rpcData || rpcData.length === 0) return [];

  const recommendedIds: number[] = rpcData.map((r: { product_id: number }) => r.product_id);
  const scoreMap = new Map<number, number>(
    rpcData.map((r: { product_id: number; score: number }) => [r.product_id, r.score])
  );

  const { data: products, error: prodError } = await supabase
    .from('products')
    .select(
      `id, name, price, cost, image, active, categories,
       mainCategory:main_category, sale_type, is_combo, max_stock,
       category_id, subcategory_id, is_producto_surtido,
       cat:categories!products_category_id_fkey(id, name),
       sub:subcategories!products_subcategory_id_fkey(id, name)`
    )
    .in('id', recommendedIds)
    .eq('active', true);

  if (prodError || !products) return [];

  const { data: stockData } = await supabase
    .from('product_stock')
    .select('product_id, quantity')
    .in('product_id', recommendedIds);

  const stockMap = new Map<number, number>((stockData ?? []).map((s) => [s.product_id, s.quantity]));

  return recommendedIds
    .map((pid) => {
      const p = products.find((x) => x.id === pid);
      // Producto Surtido requires the two-step Variedades selection
      // (ADR-0010) that every add-to-cart entry point routes through
      // (CatalogCard.tsx) except this one — excluded here rather than
      // reimplementing that flow in a one-click suggestion card.
      // Known limitation: get_recommendations() already applied LIMIT
      // before this filter runs, so a Surtido item among the top
      // candidates reduces the count shown instead of being backfilled —
      // fixing that means moving this filter inside the RPC (schema
      // change, its own verify-against-live-DB pass), deferred for now.
      if (!p || p.is_producto_surtido) return null;
      const { cat, sub, ...rest } = p as typeof p & {
        cat?: { id: number; name: string } | null;
        sub?: { id: number; name: string } | null;
      };
      return {
        ...rest,
        category_name: cat?.name ?? null,
        subcategory_name: sub?.name ?? null,
        stock_quantity: stockMap.has(pid) ? stockMap.get(pid) : undefined,
        affinity_score: scoreMap.get(pid) ?? 0,
      } as RecommendedProduct;
    })
    .filter((x): x is RecommendedProduct => x !== null);
}

export async function refreshProductAffinity(supabase: SupabaseClient, storeId: number): Promise<void> {
  const { error } = await supabase.rpc('refresh_product_affinity', { p_store_id: storeId });
  if (error) throw new Error(error.message);
}

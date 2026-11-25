import type { SupabaseClient } from '@supabase/supabase-js';
import type { TopProduct, TopCategory, RankingMetric } from '@/features/admin/types/ranking.types';
import { applyRankingCosts } from '../utils/rankingCosts';
import { NO_COSTS, type CostOptions } from '@/lib/store/costOptions';

/**
 * Service del dominio Ranking (#124) — ver ADR-0013. Dominio delgado sin
 * tabla propia, agrega datos de Orders/Products vía las funciones RPC
 * existentes (get_top_products, get_top_categories) — no toca su lógica.
 */

export interface GetTopProductsParams {
  startDate: string | null;
  endDate: string | null;
  limit: number;
  categoryId: number | null;
  metric: RankingMetric;
}

/**
 * Costo y margen salen solo con el módulo `costos` (#186). Sin indicación se trata
 * como apagado.
 */
export async function getTopProducts(
  supabase: SupabaseClient,
  storeId: number,
  params: GetTopProductsParams,
  options: CostOptions = NO_COSTS
): Promise<TopProduct[]> {
  const { data, error } = await supabase.rpc('get_top_products', {
    p_store_id: storeId,
    p_start_date: params.startDate,
    p_end_date: params.endDate,
    p_limit: params.limit,
    p_category_id: params.categoryId,
    p_metric: params.metric,
  });

  if (error) throw new Error(error.message);
  return applyRankingCosts(data as TopProduct[], options.costsEnabled);
}

export interface GetTopCategoriesParams {
  startDate: string | null;
  endDate: string | null;
  limit: number;
}

export async function getTopCategories(
  supabase: SupabaseClient,
  storeId: number,
  params: GetTopCategoriesParams
): Promise<TopCategory[]> {
  const { data, error } = await supabase.rpc('get_top_categories', {
    p_store_id: storeId,
    p_start_date: params.startDate,
    p_end_date: params.endDate,
    p_limit: params.limit,
  });

  if (error) throw new Error(error.message);
  return data;
}

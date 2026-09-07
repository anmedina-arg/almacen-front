import type { TopCategory, TopCategoriesParams, TopProduct, TopProductsParams } from '../types/ranking.types';
import { apiFetch, extractErrorMessage } from '@/lib/api/apiFetch';

/**
 * Cliente HTTP para Client Components — pasa por /api/ranking/*, a
 * diferencia del service del dominio (features/ranking/services/
 * rankingService.ts, #124). Antes se llamaba rankingService — renombrado
 * para no confundir las dos capas, mismo criterio que order/category/
 * combo/familia/stockApiClient.
 */
export const rankingApiClient = {
  async getTopProducts(params: TopProductsParams): Promise<TopProduct[]> {
    const query = new URLSearchParams();
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    query.set('limit', String(params.limit));
    if (params.categoryId !== null) query.set('category_id', String(params.categoryId));
    query.set('metric', params.metric);

    const res = await apiFetch(`/ranking?${query.toString()}`, { cache: 'no-store' });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(extractErrorMessage(body, 'Error al obtener el ranking'));
    }
    return res.json();
  },

  async getTopCategories(params: TopCategoriesParams): Promise<TopCategory[]> {
    const query = new URLSearchParams();
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    query.set('limit', String(params.limit));

    const res = await apiFetch(`/ranking/categories?${query.toString()}`, { cache: 'no-store' });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(extractErrorMessage(body, 'Error al obtener el ranking de categorías'));
    }
    return res.json();
  },
};

import type { RecommendedProduct } from '../types/recommendation.types';
import { apiFetch } from '@/lib/api/apiFetch';

/**
 * Cliente HTTP para Client Components — pasa por /api/recommendations, a
 * diferencia del service del dominio (features/recomendaciones/services/
 * recommendationService.ts, #125). Antes se llamaba recommendationService
 * — renombrado para no confundir las dos capas, mismo criterio que
 * order/category/combo/familia/stock/rankingApiClient.
 */
export const recommendationApiClient = {
  async getRecommendations(
    productIds: number[],
    excludeIds: number[] = [],
    limit = 3
  ): Promise<RecommendedProduct[]> {
    if (productIds.length === 0) return [];

    const params = new URLSearchParams();
    productIds.forEach((id) => params.append('product_ids', String(id)));
    excludeIds.forEach((id) => params.append('exclude_ids', String(id)));
    params.set('limit', String(limit));

    const res = await apiFetch(`/recommendations?${params.toString()}`, {
      cache: 'no-store',
    });

    if (!res.ok) return [];
    return res.json();
  },
};

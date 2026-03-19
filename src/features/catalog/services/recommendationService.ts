import type { RecommendedProduct } from '../types/recommendation.types';

export const recommendationService = {
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

    const res = await fetch(`/api/recommendations?${params.toString()}`, {
      cache: 'no-store',
    });

    if (!res.ok) return [];
    return res.json();
  },
};

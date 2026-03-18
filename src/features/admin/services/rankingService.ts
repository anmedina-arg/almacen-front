import type { TopCategory, TopCategoriesParams, TopProduct, TopProductsParams } from '../types/ranking.types';

export const rankingService = {
  async getTopProducts(params: TopProductsParams): Promise<TopProduct[]> {
    const query = new URLSearchParams();
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    query.set('limit', String(params.limit));
    if (params.categoryId !== null) query.set('category_id', String(params.categoryId));
    query.set('metric', params.metric);

    const res = await fetch(`/api/ranking?${query.toString()}`, { cache: 'no-store' });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error || 'Error al obtener el ranking');
    }
    return res.json();
  },

  async getTopCategories(params: TopCategoriesParams): Promise<TopCategory[]> {
    const query = new URLSearchParams();
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    query.set('limit', String(params.limit));

    const res = await fetch(`/api/ranking/categories?${query.toString()}`, { cache: 'no-store' });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error || 'Error al obtener el ranking de categorías');
    }
    return res.json();
  },
};

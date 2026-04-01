import type { StockByCategoryItem } from '@/app/api/dashboard/stock-by-category/route';

export const dashboardService = {
  async getStockByCategory(): Promise<StockByCategoryItem[]> {
    const res = await fetch('/api/dashboard/stock-by-category', { cache: 'no-store' });
    if (!res.ok) throw new Error('Error al obtener stock por categoría');
    return res.json();
  },
};

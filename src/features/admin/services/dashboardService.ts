import type { StockByCategoryItem } from '@/app/api/dashboard/stock-by-category/route';
import type { StockProductItem } from '@/app/api/dashboard/stock-products/route';

export const dashboardService = {
  async getStockByCategory(): Promise<StockByCategoryItem[]> {
    const res = await fetch('/api/dashboard/stock-by-category', { cache: 'no-store' });
    if (!res.ok) throw new Error('Error al obtener stock por categoría');
    return res.json();
  },

  async getStockProducts(category: string): Promise<StockProductItem[]> {
    const res = await fetch(`/api/dashboard/stock-products?category=${encodeURIComponent(category)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Error al obtener productos de la categoría');
    return res.json();
  },
};

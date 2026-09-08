import type { StockByCategoryItem, StockProductItem, RotationItem } from '@/features/admin/types/dashboard.types';
import { apiFetch } from '@/lib/api/apiFetch';

export type { RotationItem };

/**
 * Cliente HTTP para Client Components — pasa por /api/dashboard/*, a
 * diferencia del service del dominio (features/dashboard/services/
 * dashboardService.ts, #126). Antes se llamaba dashboardService —
 * renombrado para no confundir las dos capas, mismo criterio que
 * order/category/combo/familia/stock/ranking/recommendationApiClient.
 */
export const dashboardApiClient = {
  async getStockByCategory(): Promise<StockByCategoryItem[]> {
    const res = await apiFetch('/dashboard/stock-by-category', { cache: 'no-store' });
    if (!res.ok) throw new Error('Error al obtener stock por categoría');
    return res.json();
  },

  async getRotation(days: number): Promise<RotationItem[]> {
    const res = await apiFetch(`/dashboard/rotation?days=${days}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Error al obtener rotación de inventario');
    return res.json();
  },

  async getStockProducts(category: string): Promise<StockProductItem[]> {
    const res = await apiFetch(`/dashboard/stock-products?category=${encodeURIComponent(category)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Error al obtener productos de la categoría');
    return res.json();
  },
};

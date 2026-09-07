import type {
  ProductStockView,
  StockMovement,
  LowStockProduct,
  UpsertStockInput,
  StockEntryInput,
  StockEntryResult,
} from '../types/stock.types';
import { apiFetch } from '@/lib/api/apiFetch';

/**
 * Cliente HTTP para Client Components — pasa por /api/stock/*, a
 * diferencia del service del dominio (features/stock/services/
 * stockService.ts, #122) que llama a Supabase directo y también lo usan
 * los Server Components sin pasar por HTTP (ver ADR-0013 / ticket #107).
 * Antes se llamaba stockService — renombrado para no confundir las dos
 * capas, mismo criterio que category/combo/familia/orderApiClient.
 */
export const stockApiClient = {
  /**
   * Fetch all products with their stock levels.
   * Uses the v_product_stock view via the API route.
   */
  async getAllStock(): Promise<ProductStockView[]> {
    const res = await apiFetch('/stock', {
      cache: 'no-store',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al obtener el stock');
    }
    return res.json();
  },

  /**
   * Update (or create) stock for a product.
   * Calls the RPC function upsert_product_stock via the API route.
   */
  async upsertStock(input: UpsertStockInput): Promise<void> {
    const res = await apiFetch(`/stock/${input.p_product_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al actualizar el stock');
    }
  },

  /**
   * Fetch movement history for a specific product.
   */
  async getHistory(productId: number): Promise<StockMovement[]> {
    const res = await apiFetch(`/stock/${productId}/history`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al obtener el historial');
    }
    return res.json();
  },

  /**
   * Fetch products with low stock alerts.
   * Calls the RPC function get_low_stock_products via the API route.
   */
  async getLowStock(): Promise<LowStockProduct[]> {
    const res = await apiFetch('/stock/low-stock', {
      cache: 'no-store',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al obtener alertas de stock bajo');
    }
    return res.json();
  },

  /**
   * Increment stock for multiple products in a single batch.
   * Server-side calls increment_product_stock_batch() (#122) — one
   * round-trip, best-effort per row (errors per item do not stop the rest).
   */
  async incrementStock(entries: StockEntryInput[]): Promise<StockEntryResult[]> {
    const res = await apiFetch('/stock/entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al registrar el ingreso de stock');
    }
    const data = await res.json();
    return data.results as StockEntryResult[];
  },
};

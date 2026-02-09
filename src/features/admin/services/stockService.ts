import type {
  ProductStockView,
  StockMovement,
  LowStockProduct,
  UpsertStockInput,
} from '../types/stock.types';

// ============================================================================
// Stock Service
// ============================================================================
// Client-side service that communicates with the API route handlers.
// Follows the same pattern as adminProductService.ts.

export const stockService = {
  /**
   * Fetch all products with their stock levels.
   * Uses the v_product_stock view via the API route.
   */
  async getAllStock(): Promise<ProductStockView[]> {
    const res = await fetch('/api/stock', {
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
    const res = await fetch(`/api/stock/${input.p_product_id}`, {
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
    const res = await fetch(`/api/stock/${productId}/history`, {
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
    const res = await fetch('/api/stock/low-stock', {
      cache: 'no-store',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al obtener alertas de stock bajo');
    }
    return res.json();
  },
};

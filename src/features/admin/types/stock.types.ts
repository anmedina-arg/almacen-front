// ============================================================================
// Stock Domain Types
// ============================================================================
// Types that mirror the Supabase database schema for stock control.
// These are the canonical representations used throughout the feature.

/**
 * Valid movement types for stock changes.
 * Must match the CHECK constraint in stock_movement_log.
 */
export type StockMovementType =
  | 'manual_adjustment'
  | 'initial_count'
  | 'correction'
  | 'loss'
  | 'sale'
  | 'purchase'
  | 'return';

/**
 * Represents a row from the `v_product_stock` view.
 * This is the primary type used in the stock management UI.
 */
export interface ProductStockView {
  stock_id: number | null;
  product_id: number;
  product_name: string;
  product_price: number;
  main_category: string;
  product_active: boolean;
  product_image: string;
  quantity: number | null;
  min_stock: number | null;
  is_low_stock: boolean;
  updated_by: string | null;
  updated_by_name: string | null;
  notes: string | null;
  updated_at: string | null;
}

/**
 * Represents a row from the `stock_movement_log` table.
 * Used in the stock history modal.
 */
export interface StockMovement {
  id: number;
  product_id: number;
  movement_type: StockMovementType;
  previous_qty: number;
  new_qty: number;
  change_qty: number;
  performed_by: string;
  notes: string | null;
  created_at: string;
}

/**
 * Represents the result of `get_low_stock_products()` RPC function.
 */
export interface LowStockProduct {
  product_id: number;
  product_name: string;
  quantity: number;
  min_stock: number;
  main_category: string;
}

/**
 * Input parameters for the `upsert_product_stock()` RPC function.
 */
export interface UpsertStockInput {
  p_product_id: number;
  p_quantity: number;
  p_min_stock: number | null;
  p_notes: string | null;
  p_movement_type: StockMovementType;
}

/**
 * Form data for the stock update modal (before RPC parameter mapping).
 */
export interface StockUpdateFormData {
  productId: number;
  quantity: number;
  minStock: number | null;
  movementType: StockMovementType;
  notes: string;
}

/**
 * Filters for the stock management table.
 */
export interface StockFilters {
  search: string;
  stockFilter: 'all' | 'with_stock' | 'no_stock' | 'low_stock';
  categoryFilter: string;
}

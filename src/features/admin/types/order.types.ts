// ============================================================================
// Order Domain Types
// ============================================================================
// Types for the orders management feature.
// Mirror the Supabase database schema for orders and order_items.

/**
 * Valid statuses for an order.
 * Must match the order_status enum in the database.
 */
export type OrderStatus = 'pending' | 'confirmed' | 'cancelled';

/**
 * Represents a row from the orders table.
 */
export interface Order {
  id: number;
  user_id: string | null;
  status: OrderStatus;
  total: number;
  notes: string | null;
  whatsapp_message: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  confirmed_by: string | null;
}

/**
 * Represents a row from the order_items table.
 */
export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  is_by_weight: boolean;
  created_at: string;
}

/**
 * Order with its items included (for detail view).
 */
export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

/**
 * Input for creating an order item (sent from cart).
 */
export interface CreateOrderItemInput {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  is_by_weight: boolean;
}

/**
 * Input for creating a new order via the API.
 */
export interface CreateOrderInput {
  notes?: string;
  whatsapp_message: string;
  items: CreateOrderItemInput[];
}

/**
 * Response from the create_order RPC function.
 */
export interface CreateOrderResponse {
  order_id: number;
  total: number;
  status: OrderStatus;
  items_count: number;
}

/**
 * Input for adding a new item to an existing order (admin).
 */
export interface AddOrderItemInput {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  is_by_weight?: boolean;
}

/**
 * Input for updating an existing order item (admin).
 */
export interface UpdateOrderItemInput {
  quantity?: number;
  unit_price?: number;
}

/**
 * Filters for the orders table in admin panel.
 */
export interface OrderFilters {
  search: string;
  statusFilter: OrderStatus | 'all';
}

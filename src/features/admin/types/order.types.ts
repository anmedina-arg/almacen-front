// ============================================================================
// Order Domain Types
// ============================================================================
// Types for the orders management feature.
// Mirror the Supabase database schema for orders and order_items.

import type { Client } from './client.types';
import type { OrderPayment } from './payment.types';

/**
 * Valid statuses for an order.
 * Must match the order_status enum in the database.
 */
export type OrderStatus = 'pending' | 'confirmed' | 'cancelled';

/**
 * Represents a row from the orders table.
 * total_cost, margin and margin_pct are computed server-side and injected in the list endpoint.
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
  // Computed margin fields (undefined when no cost data available)
  total_cost?: number;
  margin?: number;
  margin_pct?: number;
  // Client assignment (nullable — orders can exist without a client)
  client_id?: number | null;
  client?: Client | null;
  // Payment methods (0, 1 or 2 records)
  order_payments?: OrderPayment[];
  // Product names from items (for client-side search)
  product_names?: string[];
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
  unit_cost: number;
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
  from_suggestion?: boolean;
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
  clientFilter: string; // display_code | 'all' | 'unassigned'
  paymentFilter: 'all' | 'debe';
}

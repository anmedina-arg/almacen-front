import type {
  Order,
  OrderWithItems,
  CreateOrderInput,
  CreateOrderResponse,
  AddOrderItemInput,
  OrderItem,
} from '../types/order.types';

// ============================================================================
// Order Service
// ============================================================================
// Client-side service that communicates with the API route handlers.
// Follows the same pattern as stockService.ts and adminProductService.ts.

export const orderService = {
  /**
   * Create a new order (public - called when user sends WhatsApp message).
   */
  async createOrder(input: CreateOrderInput): Promise<CreateOrderResponse> {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al crear el pedido');
    }
    return res.json();
  },

  /**
   * Fetch all orders (admin only).
   */
  async getAllOrders(): Promise<Order[]> {
    const res = await fetch('/api/orders', {
      cache: 'no-store',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al obtener los pedidos');
    }
    return res.json();
  },

  /**
   * Fetch a single order with its items (admin only).
   */
  async getOrderById(orderId: number): Promise<OrderWithItems> {
    const res = await fetch(`/api/orders/${orderId}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al obtener el pedido');
    }
    return res.json();
  },

  /**
   * Update order fields (admin only).
   */
  async updateOrder(orderId: number, updates: { status?: string; notes?: string | null }): Promise<Order> {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al actualizar el pedido');
    }
    return res.json();
  },

  /**
   * Confirm an order (admin only).
   */
  async confirmOrder(orderId: number): Promise<void> {
    const res = await fetch(`/api/orders/${orderId}/confirm`, {
      method: 'PUT',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al confirmar el pedido');
    }
  },

  /**
   * Add an item to an existing order (admin only).
   */
  async addOrderItem(orderId: number, item: AddOrderItemInput): Promise<OrderItem> {
    const res = await fetch(`/api/orders/${orderId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al agregar item');
    }
    return res.json();
  },

  /**
   * Remove an item from an order (admin only).
   */
  async removeOrderItem(orderId: number, itemId: number): Promise<void> {
    const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al eliminar item');
    }
  },

  /**
   * Update an item in an order (admin only).
   */
  async updateOrderItem(
    orderId: number,
    itemId: number,
    updates: { quantity?: number; unit_price?: number }
  ): Promise<OrderItem> {
    const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Error al actualizar item');
    }
    return res.json();
  },
};

/**
 * Servicio para manejar las llamadas a la API
 */

// Tipos para la API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

// Configuración base de la API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Función genérica para hacer requests a la API
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error en la petición');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Servicio de productos
 */
export const productsApi = {
  /**
   * Obtener todos los productos
   */
  async getAll(params?: {
    category?: string;
    active?: boolean;
  }): Promise<ApiResponse<any[]>> {
    const searchParams = new URLSearchParams();

    if (params?.category) {
      searchParams.append('category', params.category);
    }

    if (params?.active !== undefined) {
      searchParams.append('active', params.active.toString());
    }

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/products?${queryString}` : '/products';

    return apiRequest<any[]>(endpoint);
  },

  /**
   * Obtener un producto por ID
   */
  async getById(id: number): Promise<ApiResponse<any>> {
    return apiRequest<any>(`/products/${id}`);
  },
};

/**
 * Servicio de categorías
 */
export const categoriesApi = {
  /**
   * Obtener todas las categorías
   */
  async getAll(): Promise<ApiResponse<string[]>> {
    return apiRequest<string[]>('/categories');
  },
};

/**
 * Servicio de pedidos
 */
export const ordersApi = {
  /**
   * Crear un nuevo pedido
   */
  async create(orderData: {
    items: OrderItem[];
    customerInfo?: {
      name?: string;
      phone?: string;
      email?: string;
    };
  }): Promise<ApiResponse<Order>> {
    return apiRequest<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  },

  /**
   * Obtener todos los pedidos
   */
  async getAll(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<ApiResponse<Order[]>> {
    const searchParams = new URLSearchParams();

    if (params?.page) {
      searchParams.append('page', params.page.toString());
    }

    if (params?.limit) {
      searchParams.append('limit', params.limit.toString());
    }

    if (params?.status) {
      searchParams.append('status', params.status);
    }

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/orders?${queryString}` : '/orders';

    return apiRequest<Order[]>(endpoint);
  },

  /**
   * Obtener un pedido por ID
   */
  async getById(id: string): Promise<ApiResponse<Order>> {
    return apiRequest<Order>(`/orders/${id}`);
  },

  /**
   * Actualizar el estado de un pedido
   */
  async updateStatus(
    id: string,
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  ): Promise<ApiResponse<Order>> {
    return apiRequest<Order>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  /**
   * Eliminar un pedido
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/orders/${id}`, {
      method: 'DELETE',
    });
  },
};

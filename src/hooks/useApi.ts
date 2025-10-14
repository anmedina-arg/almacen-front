import { useState, useEffect, useCallback } from 'react';
import {
  productsApi,
  categoriesApi,
  ordersApi,
  ApiResponse,
} from '@/services/api';

/**
 * Hook para manejar el estado de carga y errores de la API
 */
export const useApiState = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeRequest = useCallback(
    async <T>(apiCall: () => Promise<ApiResponse<T>>): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiCall();

        if (response.success && response.data) {
          return response.data;
        } else {
          setError(response.error || 'Error desconocido');
          return null;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Error desconocido';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, error, executeRequest };
};

/**
 * Hook para obtener productos
 */
export const useProducts = (params?: {
  category?: string;
  active?: boolean;
}) => {
  const [products, setProducts] = useState<any[]>([]);
  const { loading, error, executeRequest } = useApiState();

  const fetchProducts = useCallback(async () => {
    const data = await executeRequest(() => productsApi.getAll(params));
    if (data) {
      setProducts(data);
    }
  }, [params, executeRequest]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
  };
};

/**
 * Hook para obtener categorías
 */
export const useCategories = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const { loading, error, executeRequest } = useApiState();

  const fetchCategories = useCallback(async () => {
    const data = await executeRequest(() => categoriesApi.getAll());
    if (data) {
      setCategories(data);
    }
  }, [executeRequest]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
  };
};

/**
 * Hook para manejar pedidos
 */
export const useOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const { loading, error, executeRequest } = useApiState();

  const fetchOrders = useCallback(
    async (params?: { page?: number; limit?: number; status?: string }) => {
      const data = await executeRequest(() => ordersApi.getAll(params));
      if (data) {
        setOrders(data);
      }
    },
    [executeRequest]
  );

  const createOrder = useCallback(
    async (orderData: {
      items: any[];
      customerInfo?: {
        name?: string;
        phone?: string;
        email?: string;
      };
    }) => {
      const data = await executeRequest(() => ordersApi.create(orderData));
      if (data) {
        // Refrescar la lista de pedidos
        await fetchOrders();
        return data;
      }
      return null;
    },
    [executeRequest, fetchOrders]
  );

  const updateOrderStatus = useCallback(
    async (
      id: string,
      status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
    ) => {
      const data = await executeRequest(() =>
        ordersApi.updateStatus(id, status)
      );
      if (data) {
        // Refrescar la lista de pedidos
        await fetchOrders();
        return data;
      }
      return null;
    },
    [executeRequest, fetchOrders]
  );

  const deleteOrder = useCallback(
    async (id: string) => {
      const data = await executeRequest(() => ordersApi.delete(id));
      if (data) {
        // Refrescar la lista de pedidos
        await fetchOrders();
        return true;
      }
      return false;
    },
    [executeRequest, fetchOrders]
  );

  return {
    orders,
    loading,
    error,
    fetchOrders,
    createOrder,
    updateOrderStatus,
    deleteOrder,
  };
};

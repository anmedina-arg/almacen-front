import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { orderApiClient } from '../services/orderApiClient';

/**
 * Fetches all orders for the admin panel.
 */
export function useOrders() {
  return useQuery({
    queryKey: adminKeys.ordersList(),
    queryFn: () => orderApiClient.getAllOrders(),
    staleTime: 30 * 1000,
  });
}

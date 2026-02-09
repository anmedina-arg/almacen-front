import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { orderService } from '../services/orderService';

/**
 * Fetches all orders for the admin panel.
 */
export function useOrders() {
  return useQuery({
    queryKey: adminKeys.ordersList(),
    queryFn: () => orderService.getAllOrders(),
    staleTime: 30 * 1000,
  });
}

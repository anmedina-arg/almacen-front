import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { orderService } from '../services/orderService';

/**
 * Fetches a single order with its items.
 * Only enabled when an orderId is provided (> 0).
 */
export function useOrderDetail(orderId: number) {
  return useQuery({
    queryKey: adminKeys.orderDetail(orderId),
    queryFn: () => orderService.getOrderById(orderId),
    enabled: orderId > 0,
    staleTime: 15 * 1000,
  });
}

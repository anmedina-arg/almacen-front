import { useMutation } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import { useInvalidateOrderQueries } from './useInvalidateOrderQueries';

/**
 * Mutation hook to cancel an order (admin only).
 * Calls cancel_order RPC which atomically returns stock and sets status to 'cancelled'.
 * Invalidates orders list and order detail queries on success.
 */
export function useCancelOrder() {
  const invalidateOrderQueries = useInvalidateOrderQueries();

  return useMutation({
    mutationFn: (orderId: number) => orderService.cancelOrder(orderId),

    onSuccess: async (_data, orderId) => {
      await invalidateOrderQueries(orderId);
    },
  });
}

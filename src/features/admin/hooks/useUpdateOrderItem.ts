import { useMutation } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import { useInvalidateOrderQueries } from './useInvalidateOrderQueries';

/**
 * Mutation hook to update an order item's quantity or price (admin only).
 * Invalidates the order detail and orders list queries on success.
 */
export function useUpdateOrderItem() {
  const invalidateOrderQueries = useInvalidateOrderQueries();

  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
      updates,
    }: {
      orderId: number;
      itemId: number;
      updates: { quantity?: number; unit_price?: number };
    }) => orderService.updateOrderItem(orderId, itemId, updates),

    onSuccess: async (_data, variables) => {
      await invalidateOrderQueries(variables.orderId);
    },
  });
}

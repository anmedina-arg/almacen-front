import { useMutation } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import { useInvalidateOrderQueries } from './useInvalidateOrderQueries';

/**
 * Mutation hook to remove an item from an existing order (admin only).
 * Invalidates the order detail and orders list queries on success.
 */
export function useRemoveOrderItem() {
  const invalidateOrderQueries = useInvalidateOrderQueries();

  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
    }: {
      orderId: number;
      itemId: number;
    }) => orderService.removeOrderItem(orderId, itemId),

    onSuccess: async (_data, variables) => {
      await invalidateOrderQueries(variables.orderId);
    },
  });
}

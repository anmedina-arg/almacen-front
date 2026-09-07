import { useMutation } from '@tanstack/react-query';
import { orderApiClient } from '../services/orderApiClient';
import { useInvalidateOrderQueries } from './useInvalidateOrderQueries';

/**
 * Mutation hook to confirm an order (admin only).
 * Invalidates the orders list and order detail queries on success.
 */
export function useConfirmOrder() {
  const invalidateOrderQueries = useInvalidateOrderQueries();

  return useMutation({
    mutationFn: (orderId: number) => orderApiClient.confirmOrder(orderId),

    onSuccess: async (_data, orderId) => {
      await invalidateOrderQueries(orderId);
    },
  });
}

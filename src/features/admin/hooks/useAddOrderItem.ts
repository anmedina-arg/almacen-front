import { useMutation } from '@tanstack/react-query';
import { orderService } from '../services/orderService';
import type { AddOrderItemInput } from '../types/order.types';
import { useInvalidateOrderQueries } from './useInvalidateOrderQueries';

/**
 * Mutation hook to add an item to an existing order (admin only).
 * Invalidates the order detail and orders list queries on success.
 */
export function useAddOrderItem() {
  const invalidateOrderQueries = useInvalidateOrderQueries();

  return useMutation({
    mutationFn: ({
      orderId,
      item,
    }: {
      orderId: number;
      item: AddOrderItemInput;
    }) => orderService.addOrderItem(orderId, item),

    onSuccess: async (_data, variables) => {
      await invalidateOrderQueries(variables.orderId);
    },
  });
}

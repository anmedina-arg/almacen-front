import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { orderService } from '../services/orderService';
import type { AddOrderItemInput } from '../types/order.types';

/**
 * Mutation hook to add an item to an existing order (admin only).
 * Invalidates the order detail and orders list queries on success.
 */
export function useAddOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      item,
    }: {
      orderId: number;
      item: AddOrderItemInput;
    }) => orderService.addOrderItem(orderId, item),

    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: adminKeys.orderDetail(variables.orderId),
      });
      await queryClient.invalidateQueries({
        queryKey: adminKeys.ordersList(),
        refetchType: 'active',
      });
    },
  });
}

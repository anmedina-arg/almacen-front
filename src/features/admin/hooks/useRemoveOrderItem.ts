import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { orderService } from '../services/orderService';

/**
 * Mutation hook to remove an item from an existing order (admin only).
 * Invalidates the order detail and orders list queries on success.
 */
export function useRemoveOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
    }: {
      orderId: number;
      itemId: number;
    }) => orderService.removeOrderItem(orderId, itemId),

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

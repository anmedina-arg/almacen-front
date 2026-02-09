import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { orderService } from '../services/orderService';

/**
 * Mutation hook to update an order item's quantity or price (admin only).
 * Invalidates the order detail and orders list queries on success.
 */
export function useUpdateOrderItem() {
  const queryClient = useQueryClient();

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

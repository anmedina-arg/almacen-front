import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { orderService } from '../services/orderService';

/**
 * Mutation hook to confirm an order (admin only).
 * Invalidates the orders list and order detail queries on success.
 */
export function useConfirmOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: number) => orderService.confirmOrder(orderId),

    onSuccess: async (_data, orderId) => {
      await queryClient.invalidateQueries({
        queryKey: adminKeys.ordersList(),
        refetchType: 'active',
      });
      await queryClient.invalidateQueries({
        queryKey: adminKeys.orderDetail(orderId),
      });
    },
  });
}

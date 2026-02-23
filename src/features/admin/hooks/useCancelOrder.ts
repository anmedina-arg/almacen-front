import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { orderService } from '../services/orderService';

/**
 * Mutation hook to cancel an order (admin only).
 * Calls cancel_order RPC which atomically returns stock and sets status to 'cancelled'.
 * Invalidates orders list and order detail queries on success.
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: number) => orderService.cancelOrder(orderId),

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

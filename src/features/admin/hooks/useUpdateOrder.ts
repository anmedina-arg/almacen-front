import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { orderApiClient } from '../services/orderApiClient';

/**
 * Mutation hook to update order fields (status, notes).
 * Invalidates the orders list and order detail queries on success.
 */
export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      updates,
    }: {
      orderId: number;
      updates: { status?: string; notes?: string | null; created_at?: string };
    }) => orderApiClient.updateOrder(orderId, updates),

    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: adminKeys.ordersList(),
        refetchType: 'active',
      });
      await queryClient.invalidateQueries({
        queryKey: adminKeys.orderDetail(variables.orderId),
      });
    },
  });
}

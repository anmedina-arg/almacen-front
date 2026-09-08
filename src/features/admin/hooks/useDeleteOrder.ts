import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { orderApiClient } from '../services/orderApiClient';

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: number) => orderApiClient.deleteOrder(orderId),
    onSuccess: (_data, orderId) => {
      // Remove cached detail immediately
      queryClient.removeQueries({ queryKey: adminKeys.orderDetail(orderId) });
      // Refresh the orders list
      queryClient.invalidateQueries({
        queryKey: adminKeys.ordersList(),
        refetchType: 'active',
      });
    },
  });
}

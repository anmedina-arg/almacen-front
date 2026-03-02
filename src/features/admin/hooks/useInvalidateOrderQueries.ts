import { useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';

export function useInvalidateOrderQueries() {
  const queryClient = useQueryClient();

  return async (orderId: number): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: adminKeys.orderDetail(orderId),
    });
    await queryClient.invalidateQueries({
      queryKey: adminKeys.ordersList(),
      refetchType: 'active',
    });
  };
}

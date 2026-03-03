import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { comboService } from '../services/comboService';

export function useUpdateComboComponents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      components,
    }: {
      productId: number;
      components: { component_product_id: number; quantity: number }[];
    }) => comboService.updateComponents(productId, components),

    onSuccess: (_, { productId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.comboComponents(productId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
    },
  });
}

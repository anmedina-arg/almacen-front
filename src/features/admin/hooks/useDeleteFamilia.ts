import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { familiaApiClient } from '../services/familiaApiClient';

export function useDeleteFamilia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => familiaApiClient.delete(id),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.familiasList() });
    },
  });
}

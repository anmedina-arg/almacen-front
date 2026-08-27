import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { familiaService } from '../services/familiaService';

export function useDeleteFamilia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => familiaService.delete(id),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.familiasList() });
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { familiaService } from '../services/familiaService';
import type { FamiliaInput } from '../schemas/familiaSchemas';

export function useCreateFamilia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FamiliaInput) => familiaService.create(data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.familiasList() });
    },
  });
}

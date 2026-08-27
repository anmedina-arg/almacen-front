import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { familiaService } from '../services/familiaService';
import type { FamiliaInput } from '../schemas/familiaSchemas';

interface UpdateFamiliaInput {
  id: number;
  data: FamiliaInput;
}

export function useUpdateFamilia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateFamiliaInput) => familiaService.update(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.familiasList() });
    },
  });
}

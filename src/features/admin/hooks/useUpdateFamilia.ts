import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { familiaApiClient } from '../services/familiaApiClient';
import type { FamiliaInput } from '@/features/products/schemas/familiaSchemas';

interface UpdateFamiliaInput {
  id: number;
  data: FamiliaInput;
}

export function useUpdateFamilia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateFamiliaInput) => familiaApiClient.update(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.familiasList() });
    },
  });
}

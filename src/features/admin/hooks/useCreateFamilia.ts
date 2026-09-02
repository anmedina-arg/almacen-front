import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { familiaApiClient } from '../services/familiaApiClient';
import type { FamiliaInput } from '@/features/products/schemas/familiaSchemas';

export function useCreateFamilia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: FamiliaInput) => familiaApiClient.create(data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.familiasList() });
    },
  });
}

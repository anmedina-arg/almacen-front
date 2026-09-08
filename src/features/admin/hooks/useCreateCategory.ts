import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { categoryApiClient } from '../services/categoryApiClient';
import type { CategoryInput } from '@/features/products/schemas/categorySchemas';

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CategoryInput) => categoryApiClient.create(data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.categoriesList() });
    },
  });
}

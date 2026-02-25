import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { categoryService } from '../services/categoryService';
import type { CategoryInput } from '../schemas/categorySchemas';

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CategoryInput) => categoryService.create(data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.categoriesList() });
    },
  });
}

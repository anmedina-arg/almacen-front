import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { categoryService } from '../services/categoryService';
import type { CategoryWithSubcategories } from '../types/category.types';

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => categoryService.delete(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: adminKeys.categoriesList() });

      const previous = queryClient.getQueryData<CategoryWithSubcategories[]>(adminKeys.categoriesList());

      queryClient.setQueryData<CategoryWithSubcategories[]>(adminKeys.categoriesList(), (old) =>
        old?.filter((c) => c.id !== id)
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(adminKeys.categoriesList(), context.previous);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.categoriesList() });
    },
  });
}

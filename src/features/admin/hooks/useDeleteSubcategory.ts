import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { categoryService } from '../services/categoryService';

interface DeleteSubcategoryInput {
  id: number;
  categoryId: number;
}

export function useDeleteSubcategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: DeleteSubcategoryInput) => categoryService.deleteSubcategory(id),

    onSuccess: (_data, { categoryId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.categoriesList() });
      queryClient.invalidateQueries({ queryKey: adminKeys.categorySubcategories(categoryId) });
    },
  });
}

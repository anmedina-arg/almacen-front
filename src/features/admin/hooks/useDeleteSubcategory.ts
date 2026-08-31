import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { categoryApiClient } from '../services/categoryApiClient';

interface DeleteSubcategoryInput {
  id: number;
  categoryId: number;
}

export function useDeleteSubcategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: DeleteSubcategoryInput) => categoryApiClient.deleteSubcategory(id),

    onSuccess: (_data, { categoryId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.categoriesList() });
      queryClient.invalidateQueries({ queryKey: adminKeys.categorySubcategories(categoryId) });
    },
  });
}

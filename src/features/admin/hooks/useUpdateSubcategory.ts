import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { categoryService } from '../services/categoryService';

interface UpdateSubcategoryInput {
  id: number;
  categoryId: number;
  name: string;
}

export function useUpdateSubcategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: UpdateSubcategoryInput) =>
      categoryService.updateSubcategory(id, name),

    onSuccess: (_data, { categoryId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.categoriesList() });
      queryClient.invalidateQueries({ queryKey: adminKeys.categorySubcategories(categoryId) });
    },
  });
}

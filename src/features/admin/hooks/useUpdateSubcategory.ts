import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { categoryApiClient } from '../services/categoryApiClient';

interface UpdateSubcategoryInput {
  id: number;
  categoryId: number;
  name: string;
}

export function useUpdateSubcategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: UpdateSubcategoryInput) =>
      categoryApiClient.updateSubcategory(id, name),

    onSuccess: (_data, { categoryId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.categoriesList() });
      queryClient.invalidateQueries({ queryKey: adminKeys.categorySubcategories(categoryId) });
    },
  });
}

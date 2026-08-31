import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { categoryApiClient } from '../services/categoryApiClient';

interface CreateSubcategoryInput {
  categoryId: number;
  name: string;
}

export function useCreateSubcategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ categoryId, name }: CreateSubcategoryInput) =>
      categoryApiClient.createSubcategory(categoryId, name),

    onSuccess: (_data, { categoryId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.categoriesList() });
      queryClient.invalidateQueries({ queryKey: adminKeys.categorySubcategories(categoryId) });
    },
  });
}

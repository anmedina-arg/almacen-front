import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { categoryService } from '../services/categoryService';
import type { CategoryInput } from '../schemas/categorySchemas';
import type { CategoryWithSubcategories } from '../types/category.types';

interface UpdateCategoryInput {
  id: number;
  data: CategoryInput;
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateCategoryInput) => categoryService.update(id, data),

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: adminKeys.categoriesList() });

      const previous = queryClient.getQueryData<CategoryWithSubcategories[]>(adminKeys.categoriesList());

      queryClient.setQueryData<CategoryWithSubcategories[]>(adminKeys.categoriesList(), (old) =>
        old?.map((c) => (c.id === id ? { ...c, name: data.name, image_url: data.image_url ?? c.image_url } : c))
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

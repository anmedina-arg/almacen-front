import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';

interface ReorderSubcategoriesInput {
  categoryId: number;
  orderedIds: number[];
}

async function reorderSubcategories({ categoryId, orderedIds }: ReorderSubcategoriesInput): Promise<void> {
  const res = await fetch(`/api/categories/${categoryId}/subcategories/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al reordenar subcategorías');
  }
}

export function useReorderSubcategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reorderSubcategories,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.categoriesList() });
    },
  });
}

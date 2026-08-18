import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/apiFetch';
import { adminKeys } from '../constants/queryKeys';

async function reorderCategories(orderedIds: number[]): Promise<void> {
  const res = await apiFetch('/categories/reorder', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Error al reordenar categorías');
  }
}

export function useReorderCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reorderCategories,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.categoriesList() });
    },
  });
}

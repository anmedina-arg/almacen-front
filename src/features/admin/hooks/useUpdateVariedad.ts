import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { familiaService } from '../services/familiaService';

interface UpdateVariedadInput {
  id: number;
  data: { name?: string; active?: boolean };
}

// Cubre tanto el rename inline como el toggle de active — mismo endpoint,
// mismo hook, la diferencia está en qué campo viene en `data`.
export function useUpdateVariedad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateVariedadInput) => familiaService.updateVariedad(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.familiasList() });
    },
  });
}

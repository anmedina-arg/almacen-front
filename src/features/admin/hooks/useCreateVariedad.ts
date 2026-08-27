import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { familiaService } from '../services/familiaService';

interface CreateVariedadInput {
  familiaId: number;
  name: string;
}

export function useCreateVariedad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ familiaId, name }: CreateVariedadInput) =>
      familiaService.createVariedad(familiaId, name),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.familiasList() });
    },
  });
}

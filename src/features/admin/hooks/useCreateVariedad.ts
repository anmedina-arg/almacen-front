import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { familiaApiClient } from '../services/familiaApiClient';

interface CreateVariedadInput {
  familiaId: number;
  name: string;
}

export function useCreateVariedad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ familiaId, name }: CreateVariedadInput) =>
      familiaApiClient.createVariedad(familiaId, name),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.familiasList() });
    },
  });
}

import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { familiaApiClient } from '../services/familiaApiClient';

export function useFamilias() {
  return useQuery({
    queryKey: adminKeys.familiasList(),
    queryFn: familiaApiClient.getAllWithVariedades,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

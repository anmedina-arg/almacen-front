import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { familiaService } from '../services/familiaService';

export function useFamilias() {
  return useQuery({
    queryKey: adminKeys.familiasList(),
    queryFn: familiaService.getAllWithVariedades,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

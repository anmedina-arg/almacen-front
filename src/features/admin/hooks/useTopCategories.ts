import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { rankingService } from '../services/rankingService';
import type { TopCategoriesParams } from '../types/ranking.types';

export function useTopCategories(params: TopCategoriesParams) {
  return useQuery({
    queryKey: adminKeys.topCategories(params),
    queryFn: () => rankingService.getTopCategories(params),
    staleTime: 1000 * 60,
  });
}

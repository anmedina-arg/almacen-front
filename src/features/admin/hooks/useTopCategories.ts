import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { rankingApiClient } from '../services/rankingApiClient';
import type { TopCategoriesParams } from '../types/ranking.types';

export function useTopCategories(params: TopCategoriesParams) {
  return useQuery({
    queryKey: adminKeys.topCategories(params),
    queryFn: () => rankingApiClient.getTopCategories(params),
    staleTime: 1000 * 60,
  });
}

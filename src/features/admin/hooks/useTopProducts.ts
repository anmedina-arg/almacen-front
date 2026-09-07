import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { rankingApiClient } from '../services/rankingApiClient';
import type { TopProductsParams } from '../types/ranking.types';

export function useTopProducts(params: TopProductsParams) {
  return useQuery({
    queryKey: adminKeys.topProducts(params),
    queryFn: () => rankingApiClient.getTopProducts(params),
    staleTime: 1000 * 60, // 1 minute
  });
}

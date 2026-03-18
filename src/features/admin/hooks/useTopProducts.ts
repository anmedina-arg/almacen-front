import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { rankingService } from '../services/rankingService';
import type { TopProductsParams } from '../types/ranking.types';

export function useTopProducts(params: TopProductsParams) {
  return useQuery({
    queryKey: adminKeys.topProducts(params),
    queryFn: () => rankingService.getTopProducts(params),
    staleTime: 1000 * 60, // 1 minute
  });
}

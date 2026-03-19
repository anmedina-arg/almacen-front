'use client';

import { useQuery } from '@tanstack/react-query';
import { recommendationService } from '../services/recommendationService';
import type { RecommendedProduct } from '../types/recommendation.types';

const catalogKeys = {
  recommendations: (productIds: number[], excludeIds: number[]) =>
    ['catalog', 'recommendations', productIds.slice().sort(), excludeIds.slice().sort()] as const,
};

export function useRecommendations(
  productIds: number[],
  excludeIds: number[] = [],
  limit = 3
) {
  return useQuery<RecommendedProduct[]>({
    queryKey: catalogKeys.recommendations(productIds, excludeIds),
    queryFn: () => recommendationService.getRecommendations(productIds, excludeIds, limit),
    enabled: productIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

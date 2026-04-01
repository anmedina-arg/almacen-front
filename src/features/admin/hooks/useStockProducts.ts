'use client';

import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { dashboardService } from '../services/dashboardService';

export function useStockProducts(category: string | null) {
  return useQuery({
    queryKey: adminKeys.dashboardStockProducts(category ?? ''),
    queryFn: () => dashboardService.getStockProducts(category!),
    enabled: !!category,
    staleTime: 5 * 60 * 1000,
  });
}

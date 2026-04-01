'use client';

import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { dashboardService } from '../services/dashboardService';

export function useStockByCategory() {
  return useQuery({
    queryKey: adminKeys.dashboardStockByCategory(),
    queryFn: () => dashboardService.getStockByCategory(),
    staleTime: 5 * 60 * 1000,
  });
}

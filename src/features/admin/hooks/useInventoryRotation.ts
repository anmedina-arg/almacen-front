'use client';

import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { dashboardService } from '../services/dashboardService';

export function useInventoryRotation(days: number) {
  return useQuery({
    queryKey: adminKeys.dashboardRotation(days),
    queryFn: () => dashboardService.getRotation(days),
    staleTime: 5 * 60 * 1000,
  });
}

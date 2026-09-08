'use client';

import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { dashboardApiClient } from '../services/dashboardApiClient';

export function useInventoryRotation(days: number) {
  return useQuery({
    queryKey: adminKeys.dashboardRotation(days),
    queryFn: () => dashboardApiClient.getRotation(days),
    staleTime: 5 * 60 * 1000,
  });
}

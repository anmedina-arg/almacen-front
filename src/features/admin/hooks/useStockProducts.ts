'use client';

import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { dashboardApiClient } from '../services/dashboardApiClient';

export function useStockProducts(category: string | null, enabled = true) {
  return useQuery({
    queryKey: adminKeys.dashboardStockProducts(category ?? ''),
    queryFn: () => dashboardApiClient.getStockProducts(category!),
    // #126: la ruta ahora exige la flag 'stock' server-side — ver mismo
    // comentario en useStockByCategory.
    enabled: !!category && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

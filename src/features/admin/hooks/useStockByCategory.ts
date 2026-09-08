'use client';

import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { dashboardApiClient } from '../services/dashboardApiClient';

export function useStockByCategory(enabled = true) {
  return useQuery({
    queryKey: adminKeys.dashboardStockByCategory(),
    queryFn: () => dashboardApiClient.getStockByCategory(),
    // #126: la ruta ahora exige la flag 'stock' server-side — sin este
    // gate, un Store con stock:false dispara igual el fetch (aunque el
    // widget no se renderice) y recibe un 403 en cada carga del dashboard.
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

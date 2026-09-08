import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { stockApiClient } from '../services/stockApiClient';

/**
 * Fetches products with low stock alerts.
 * Uses the get_low_stock_products RPC function via the API route.
 */
export function useLowStock() {
  return useQuery({
    queryKey: adminKeys.lowStock(),
    queryFn: stockApiClient.getLowStock,
    staleTime: 30 * 1000,
  });
}

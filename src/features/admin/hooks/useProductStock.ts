import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { stockApiClient } from '../services/stockApiClient';

/**
 * Fetches all products with their stock levels.
 * Uses the v_product_stock view via the API route.
 */
export function useProductStock() {
  return useQuery({
    queryKey: adminKeys.stockList(),
    queryFn: stockApiClient.getAllStock,
    staleTime: 5 * 60 * 1000, // mismo criterio que useStockProducts/useStockByCategory (#143)
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
  });
}

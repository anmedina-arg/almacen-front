import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { stockApiClient } from '../services/stockApiClient';

/**
 * Fetches all products with their stock levels.
 * Uses the get_all_products_with_stock RPC via the API route (#133: the legacy v_product_stock view was dropped).
 */
export function useProductStock() {
  return useQuery({
    queryKey: adminKeys.stockList(),
    queryFn: stockApiClient.getAllStock,
    staleTime: 5 * 60 * 1000, // mismo criterio que useStockProducts/useStockByCategory (#143)
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
  });
}

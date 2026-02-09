import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { stockService } from '../services/stockService';

/**
 * Fetches all products with their stock levels.
 * Uses the v_product_stock view via the API route.
 */
export function useProductStock() {
  return useQuery({
    queryKey: adminKeys.stockList(),
    queryFn: stockService.getAllStock,
    staleTime: 0, // Sin staleTime para debugging
    gcTime: 5 * 60 * 1000, // 5 minutos en cache
  });
}

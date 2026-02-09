import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { stockService } from '../services/stockService';

/**
 * Fetches the stock movement history for a specific product.
 * Only enabled when a productId is provided (> 0).
 */
export function useStockHistory(productId: number) {
  return useQuery({
    queryKey: adminKeys.stockHistory(productId),
    queryFn: () => stockService.getHistory(productId),
    enabled: productId > 0,
    staleTime: 30 * 1000,
  });
}

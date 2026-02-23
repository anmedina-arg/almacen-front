import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { stockService } from '../services/stockService';
import type { StockEntryInput, StockEntryResult } from '../types/stock.types';

/**
 * Mutation hook para incrementar el stock de múltiples productos en lote.
 * Usa best-effort: cada item puede fallar independientemente.
 * Invalida stock list, low stock y el historial de todos los productos afectados.
 */
export function useBatchIncrementStock() {
  const queryClient = useQueryClient();

  return useMutation<StockEntryResult[], Error, StockEntryInput[]>({
    mutationFn: (entries) => stockService.incrementStock(entries),

    onSuccess: async (_results, variables) => {
      // Invalidar lista de stock y alertas de stock bajo
      await queryClient.invalidateQueries({
        queryKey: adminKeys.stockList(),
        refetchType: 'active',
      });
      await queryClient.invalidateQueries({ queryKey: adminKeys.lowStock() });

      // Invalidar historial de cada producto afectado
      for (const entry of variables) {
        await queryClient.invalidateQueries({
          queryKey: adminKeys.stockHistory(entry.product_id),
        });
      }
    },
  });
}

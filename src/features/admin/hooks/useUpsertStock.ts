import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { stockService } from '../services/stockService';
import type { UpsertStockInput } from '../types/stock.types';

/**
 * Mutation hook para crear o actualizar el stock de un producto.
 * Invalida las queries de stock list, low stock e historial tras el exito.
 */
export function useUpsertStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpsertStockInput) => stockService.upsertStock(input),

    onSuccess: async (_data, variables) => {
      // Invalidar y refetch inmediato de la lista de stock
      await queryClient.invalidateQueries({
        queryKey: adminKeys.stockList(),
        refetchType: 'active'
      });

      // Invalidar alertas de stock bajo
      await queryClient.invalidateQueries({ queryKey: adminKeys.lowStock() });

      // Invalidar historial del producto afectado
      await queryClient.invalidateQueries({
        queryKey: adminKeys.stockHistory(variables.p_product_id),
      });
    },
  });
}

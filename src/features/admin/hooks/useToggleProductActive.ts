import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { adminProductService } from '../services/adminProductService';
import type { Product } from '@/types';

interface ToggleActiveInput {
  id: number;
  newActive: boolean;
}

/**
 * Mutation hook para activar o desactivar un producto.
 *
 * Recibe { id, newActive } en lugar de solo id para evitar que mutationFn
 * lea el cache DESPUÉS de que onMutate ya lo modificó (lo que causaría que
 * se calculara !product.active sobre el valor ya toggleado, invirtiendo la acción).
 */
export function useToggleProductActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newActive }: ToggleActiveInput) =>
      adminProductService.update(id, { active: newActive }),

    onMutate: async ({ id, newActive }) => {
      await queryClient.cancelQueries({ queryKey: adminKeys.productsList() });

      const previousProducts = queryClient.getQueryData<Product[]>(adminKeys.productsList());

      // Actualización optimista con el valor correcto
      queryClient.setQueryData<Product[]>(adminKeys.productsList(), (old) =>
        old?.map((p) => (p.id === id ? { ...p, active: newActive } : p))
      );

      return { previousProducts };
    },

    onError: (_err, _variables, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(adminKeys.productsList(), context.previousProducts);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.productsList() });
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { adminProductService } from '../services/adminProductService';
import type { Product } from '@/types';

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminProductService.delete,

    onMutate: async (id) => {
      // Cancelar queries en curso
      await queryClient.cancelQueries({ queryKey: adminKeys.productsList() });

      // Snapshot del estado anterior
      const previousProducts = queryClient.getQueryData<Product[]>(adminKeys.productsList());

      // Eliminación optimista
      queryClient.setQueryData<Product[]>(adminKeys.productsList(), (old) =>
        old?.filter((p) => p.id !== id)
      );

      return { previousProducts };
    },

    onError: (err, variables, context) => {
      // Rollback en caso de error
      if (context?.previousProducts) {
        queryClient.setQueryData(adminKeys.productsList(), context.previousProducts);
      }
    },

    onSuccess: () => {
      // Invalidar para sincronizar con servidor
      queryClient.invalidateQueries({ queryKey: adminKeys.productsList() });
    },
  });
}

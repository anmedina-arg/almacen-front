import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { adminProductService } from '../services/adminProductService';
import type { Product } from '@/types';

export function useToggleProductActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const products = queryClient.getQueryData<Product[]>(adminKeys.productsList());
      const product = products?.find((p) => p.id === id);
      if (!product) throw new Error('Product not found');

      return adminProductService.update(id, { active: !product.active });
    },

    onMutate: async (id) => {
      // Cancelar queries en curso
      await queryClient.cancelQueries({ queryKey: adminKeys.productsList() });

      // Snapshot del estado anterior
      const previousProducts = queryClient.getQueryData<Product[]>(adminKeys.productsList());

      // Toggle optimista
      queryClient.setQueryData<Product[]>(adminKeys.productsList(), (old) =>
        old?.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
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

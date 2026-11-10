import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { adminProductService } from '../services/adminProductService';
import type { Product } from '@/types';

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminProductService.create,

    onSuccess: (newProduct) => {
      // Agregar optimistically
      queryClient.setQueryData<Product[]>(adminKeys.productsList(), (old) => {
        if (!old) return [newProduct];
        return [...old, newProduct];
      });

      // Invalidar para refrescar desde servidor. Un combo nuevo también trae
      // componentes (#167): se invalida todo el prefijo de productos.
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
    },
  });
}

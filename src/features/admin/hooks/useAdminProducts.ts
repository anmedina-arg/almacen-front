import { useQuery } from '@tanstack/react-query';
import { adminKeys } from '../constants/queryKeys';
import { adminProductService } from '../services/adminProductService';

export function useAdminProducts() {
  return useQuery({
    queryKey: adminKeys.productsList(),
    queryFn: adminProductService.getAll,
    staleTime: 30 * 1000, // 30 segundos
  });
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { productKeys } from '@/constants/queryKeys';
import { productService } from '@/services/productService';

export function useProducts(options?: { includeInactive?: boolean }) {
  return useQuery({
    queryKey: productKeys.list({ includeInactive: options?.includeInactive ?? false }),
    queryFn: () => productService.fetchProducts(options),
    staleTime: Infinity,
  });
}

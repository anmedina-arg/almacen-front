'use client';

import { useQuery } from '@tanstack/react-query';
import { productKeys } from '@/constants/queryKeys';
import { productService } from '@/services/productService';
import type { Product } from '@/types';

export function useProducts(options?: { includeInactive?: boolean; initialData?: Product[] }) {
  return useQuery({
    queryKey: productKeys.list({ includeInactive: options?.includeInactive ?? false }),
    queryFn: () => productService.fetchProducts(options),
    staleTime: Infinity,
    ...(options?.initialData ? { initialData: options.initialData } : {}),
  });
}

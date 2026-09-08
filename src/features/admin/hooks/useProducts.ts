'use client';

import { useQuery } from '@tanstack/react-query';
import { productKeys } from '../constants/queryKeys';
import { productApiClient } from '../services/productApiClient';
import type { Product } from '@/types';

export function useProducts(options?: { includeInactive?: boolean; initialData?: Product[] }) {
  return useQuery({
    queryKey: productKeys.list({ includeInactive: options?.includeInactive ?? false }),
    queryFn: () => productApiClient.fetchProducts(options),
    staleTime: Infinity,
    ...(options?.initialData ? { initialData: options.initialData } : {}),
  });
}

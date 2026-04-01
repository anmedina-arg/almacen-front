'use client';

import { useQuery } from '@tanstack/react-query';
import type { Product } from '@/types';

async function searchProducts(query: string): Promise<Product[]> {
  const res = await fetch(`/api/products?search=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Error al buscar productos');
  return res.json();
}

/**
 * Server-side product search via /api/products?search=
 * Only fires when debouncedSearch is non-empty.
 * Results are cached 2 minutes per unique query string.
 */
export function useProductSearchQuery(debouncedSearch: string) {
  return useQuery({
    queryKey: ['products', 'search', debouncedSearch],
    queryFn: () => searchProducts(debouncedSearch),
    enabled: debouncedSearch.length > 0,
    staleTime: 2 * 60 * 1000,
    placeholderData: (prev) => prev, // keeps previous results visible while fetching
  });
}

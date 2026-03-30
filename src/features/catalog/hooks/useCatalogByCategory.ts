'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { productKeys } from '@/constants/queryKeys';
import type { Product } from '@/types';

async function fetchCategoryProducts(categoryId: number): Promise<Product[]> {
  const res = await fetch(`/api/products?categoryId=${categoryId}`);
  if (!res.ok) throw new Error('Error al cargar productos');
  return res.json();
}

interface UseCatalogByCategoryOptions {
  /** Ordered list of all category IDs (from DB sort_order ASC). */
  orderedCategoryIds: number[];
  /** SSR-hydrated products for the first category. */
  initialProducts: Product[];
}

/**
 * Infinite query that loads one category's products at a time.
 * - Page 0 is hydrated from SSR (initialProducts) — no network request.
 * - Pages 1..N are fetched lazily as the user scrolls.
 * - Each pageParam is the index into orderedCategoryIds.
 */
export function useCatalogByCategory({
  orderedCategoryIds,
  initialProducts,
}: UseCatalogByCategoryOptions) {
  return useInfiniteQuery({
    queryKey: productKeys.catalog(),
    queryFn: ({ pageParam }) =>
      fetchCategoryProducts(orderedCategoryIds[pageParam as number]),
    initialPageParam: 0,
    getNextPageParam: (_, __, lastPageParam) => {
      const nextIndex = (lastPageParam as number) + 1;
      return nextIndex < orderedCategoryIds.length ? nextIndex : undefined;
    },
    initialData: {
      pages: [initialProducts],
      pageParams: [0],
    },
    staleTime: 5 * 60 * 1000,
  });
}

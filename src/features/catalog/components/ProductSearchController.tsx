'use client';

import { useMemo, useEffect, useRef } from 'react';
import type { Product, CategoryWithSubsPublic } from '../types';
import { useCatalogByCategory } from '../hooks/useCatalogByCategory';
import { useProductSearch } from '../hooks/useProductSearch';
import { ProductSearchBar } from './ProductSearchBar';
import { ProductSearchSection } from './ProductSearchSection';

interface ProductSearchControllerProps {
  initialProducts: Product[];
  categories: CategoryWithSubsPublic[];
}

export function ProductSearchController({
  initialProducts,
  categories,
}: ProductSearchControllerProps) {
  const orderedCategoryIds = useMemo(() => categories.map((c) => c.id), [categories]);
  const orderedCategories = useMemo(() => categories.map((c) => c.name), [categories]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useCatalogByCategory({
    orderedCategoryIds,
    initialProducts,
  });

  // Flatten all loaded category pages into a single product array for search/grouping.
  const products = useMemo(
    () => data?.pages.flat() ?? initialProducts,
    [data, initialProducts]
  );

  const { search, setSearch, filteredProducts, displayCategories, debouncedSearch } =
    useProductSearch(products, orderedCategories);

  // Sentinel: when it enters the viewport, load the next category.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '400px' }
    );
    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <>
      <ProductSearchBar value={search} onChange={setSearch} />
      <ProductSearchSection
        filteredProducts={filteredProducts}
        displayCategories={displayCategories}
        searchQuery={debouncedSearch}
      />
      {/* Sentinel placed after the product list to trigger next-category fetch */}
      <div ref={sentinelRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="flex justify-center py-6 text-sm text-gray-400">
          Cargando más productos...
        </div>
      )}
    </>
  );
}

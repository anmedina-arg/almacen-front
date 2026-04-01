'use client';

import { useMemo, useEffect, useRef } from 'react';
import type { Product, CategoryWithSubsPublic } from '../types';
import { useCatalogByCategory } from '../hooks/useCatalogByCategory';
import { useProductSearch } from '../hooks/useProductSearch';
import { useProductSearchQuery } from '../hooks/useProductSearchQuery';
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

  const { search, setSearch, debouncedSearch } = useProductSearch();
  const isSearchMode = debouncedSearch.length > 0;

  // Browse mode: infinite query, one category at a time.
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useCatalogByCategory({
    orderedCategoryIds,
    initialProducts,
  });

  // Search mode: server-side query, full catalog.
  const { data: searchResults, isFetching: isSearchFetching } = useProductSearchQuery(debouncedSearch);

  // Products and categories depend on current mode.
  const products = isSearchMode
    ? (searchResults ?? [])
    : (data?.pages.flat() ?? initialProducts);

  const displayCategories = useMemo(() => {
    if (!isSearchMode) return orderedCategories;
    // In search mode, only show categories that have matching products,
    // preserving the admin-defined sort_order.
    const catsWithProducts = new Set(
      products.map((p) => p.category_name).filter(Boolean) as string[]
    );
    return orderedCategories.filter((name) => catsWithProducts.has(name));
  }, [isSearchMode, products, orderedCategories]);

  // Sentinel: trigger next category fetch when scrolling in browse mode.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasNextPage || isSearchMode) return;
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
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isSearchMode]);

  return (
    <>
      <ProductSearchBar value={search} onChange={setSearch} />

      {isSearchMode && isSearchFetching && products.length === 0 ? (
        <div className="flex justify-center py-10 text-sm text-gray-400">
          Buscando...
        </div>
      ) : (
        <ProductSearchSection
          filteredProducts={products}
          displayCategories={displayCategories}
          searchQuery={debouncedSearch}
        />
      )}

      {/* Sentinel: only active in browse mode */}
      {!isSearchMode && <div ref={sentinelRef} className="h-1" />}
      {!isSearchMode && isFetchingNextPage && (
        <div className="flex justify-center py-6 text-sm text-gray-400">
          Cargando más productos...
        </div>
      )}
    </>
  );
}

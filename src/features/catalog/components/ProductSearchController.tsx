'use client';

import { useMemo } from 'react';
import type { Product, CategoryWithSubsPublic } from '../types';
import { useCatalogSearchStore } from '../stores/catalogSearchStore';
import { useProductSearchQuery } from '../hooks/useProductSearchQuery';
import { ProductSearchSection } from './ProductSearchSection';

interface ProductSearchControllerProps {
  initialProducts: Product[];
  categories: CategoryWithSubsPublic[];
}

export function ProductSearchController({
  initialProducts,
  categories,
}: ProductSearchControllerProps) {
  const orderedCategories = useMemo(() => categories.map((c) => c.name), [categories]);

  const debouncedSearch = useCatalogSearchStore((s) => s.debouncedSearch);
  const isSearchMode = debouncedSearch.length > 0;

  const { data: searchResults, isFetching: isSearchFetching } = useProductSearchQuery(debouncedSearch);

  const products = useMemo(
    () => (isSearchMode ? (searchResults ?? []) : initialProducts),
    [isSearchMode, searchResults, initialProducts],
  );

  const displayCategories = useMemo(() => {
    if (!isSearchMode) return orderedCategories;
    const catsWithProducts = new Set(
      products.map((p) => p.category_name).filter(Boolean) as string[]
    );
    return orderedCategories.filter((name) => catsWithProducts.has(name));
  }, [isSearchMode, products, orderedCategories]);

  if (isSearchMode && isSearchFetching && products.length === 0) {
    return (
      <div className="flex justify-center py-10 text-sm text-gray-400">
        Buscando...
      </div>
    );
  }

  return (
    <ProductSearchSection
      filteredProducts={products}
      displayCategories={displayCategories}
      searchQuery={debouncedSearch}
    />
  );
}

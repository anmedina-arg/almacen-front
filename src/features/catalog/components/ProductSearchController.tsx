'use client';

import { useMemo } from 'react';
import type { Product, CategoryWithSubsPublic } from '../types';
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
  const orderedCategories = useMemo(() => categories.map((c) => c.name), [categories]);

  const { search, setSearch, debouncedSearch } = useProductSearch();
  const isSearchMode = debouncedSearch.length > 0;

  // Search mode: server-side query, full catalog.
  const { data: searchResults, isFetching: isSearchFetching } = useProductSearchQuery(debouncedSearch);

  // Browse mode: todos los productos ya están en memoria desde SSR.
  const products = useMemo(
    () => (isSearchMode ? (searchResults ?? []) : initialProducts),
    [isSearchMode, searchResults, initialProducts],
  );

  const displayCategories = useMemo(() => {
    if (!isSearchMode) return orderedCategories;
    // En search mode, solo mostrar categorías con productos que matchean,
    // respetando el sort_order definido en admin.
    const catsWithProducts = new Set(
      products.map((p) => p.category_name).filter(Boolean) as string[]
    );
    return orderedCategories.filter((name) => catsWithProducts.has(name));
  }, [isSearchMode, products, orderedCategories]);

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
    </>
  );
}

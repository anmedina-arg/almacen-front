'use client';

import type { Product } from '../types';
import { useProducts } from '@/hooks/useProducts';
import { useProductSearch } from '../hooks/useProductSearch';
import { ProductSearchBar } from './ProductSearchBar';
import { ProductSearchSection } from './ProductSearchSection';

interface ProductSearchControllerProps {
  initialProducts: Product[];
  orderedCategories: string[];
}

export function ProductSearchController({ initialProducts, orderedCategories }: ProductSearchControllerProps) {
  const { data: products = initialProducts } = useProducts({ initialData: initialProducts });

  const { search, setSearch, filteredProducts, displayCategories, debouncedSearch } =
    useProductSearch(products, orderedCategories);

  return (
    <>
      <ProductSearchBar value={search} onChange={setSearch} />
      <ProductSearchSection
        filteredProducts={filteredProducts}
        displayCategories={displayCategories}
        searchQuery={debouncedSearch}
      />
    </>
  );
}

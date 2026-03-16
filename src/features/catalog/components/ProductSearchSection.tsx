'use client';

import type { Product } from '../types';
import { ProductList } from './ProductList';
import { ProductSearchEmptyState } from './ProductSearchEmptyState';

interface ProductSearchSectionProps {
  filteredProducts: Product[];
  displayCategories: string[];
  searchQuery: string;
}

export function ProductSearchSection({
  filteredProducts,
  displayCategories,
  searchQuery,
}: ProductSearchSectionProps) {
  if (filteredProducts.length === 0) {
    return <ProductSearchEmptyState />;
  }

  return (
    <ProductList
      products={filteredProducts}
      mainCategories={displayCategories}
      searchQuery={searchQuery}
    />
  );
}

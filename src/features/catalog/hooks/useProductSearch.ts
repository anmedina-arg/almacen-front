'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Product } from '../types';
import { normalize } from '@/utils/normalize';

/**
 * Handles client-side product search and category ordering.
 *
 * @param products       - Full product list from server (SSR hydrated).
 * @param orderedCategories - Category names in admin-defined sort_order.
 *   Used as the authoritative display order. Categories not present in this
 *   list (e.g. products with no category_id) fall through as-is.
 */
export function useProductSearch(products: Product[], orderedCategories: string[]) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const filteredProducts = useMemo(() => {
    const q = normalize(debouncedSearch);
    if (!q) return products;
    return products.filter((p) => normalize(p.name).includes(q));
  }, [products, debouncedSearch]);

  // Respect admin-defined category order: filter orderedCategories to those
  // that have at least one visible product after search filtering.
  const displayCategories = useMemo(() => {
    const catsWithProducts = new Set(
      filteredProducts
        .map((p) => p.category_name ?? String(p.mainCategory))
        .filter(Boolean)
    );
    return orderedCategories.filter((name) => catsWithProducts.has(name));
  }, [filteredProducts, orderedCategories]);

  return { search, setSearch, filteredProducts, displayCategories, debouncedSearch };
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Product } from '../types';
import { normalize } from '@/utils/normalize';

export function useProductSearch(products: Product[]) {
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

  const displayCategories = useMemo(() => {
    const cats = filteredProducts.map((p) => p.category_name ?? String(p.mainCategory));
    return Array.from(new Set(cats)).filter(Boolean);
  }, [filteredProducts]);

  return { search, setSearch, filteredProducts, displayCategories, debouncedSearch };
}

'use client';

import { useState, useEffect } from 'react';

/**
 * Manages search input state with debounce.
 * Filtering logic moved to ProductSearchController which
 * switches between browse mode (local) and search mode (server).
 */
export function useProductSearch() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handler);
  }, [search]);

  return { search, setSearch, debouncedSearch };
}

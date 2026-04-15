'use client';

import { useEffect } from 'react';
import { useCatalogSearchStore } from '../stores/catalogSearchStore';
import { useCatalogViewStore } from '../stores/catalogViewStore';

function ListIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-5 h-5" fill="currentColor">
      <rect x="5" y="7" width="22" height="4" rx="2" />
      <rect x="5" y="14" width="22" height="4" rx="2" />
      <rect x="5" y="21" width="22" height="4" rx="2" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-5 h-5" fill="currentColor">
      <rect x="5" y="5" width="9" height="9" rx="2" />
      <rect x="18" y="5" width="9" height="9" rx="2" />
      <rect x="5" y="18" width="9" height="9" rx="2" />
      <rect x="18" y="18" width="9" height="9" rx="2" />
    </svg>
  );
}

export function ProductSearchBar() {
  const { search, setSearch, setDebouncedSearch } = useCatalogSearchStore();
  const { view, setView } = useCatalogViewStore();

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handler);
  }, [search, setDebouncedSearch]);

  const toggleView = () => setView(view === 'list' ? 'grid' : 'list');

  return (
    <div className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-md">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar producto por nombre..."
        className="w-full max-w-lg bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
        aria-label="Buscar productos"
      />
      <button
        onClick={toggleView}
        aria-label={view === 'list' ? 'Cambiar a vista grilla' : 'Cambiar a vista lista'}
        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
      >
        {view === 'list' ? <GridIcon /> : <ListIcon />}
      </button>
    </div>
  );
}

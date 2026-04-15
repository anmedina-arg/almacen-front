import { create } from 'zustand';

interface CatalogSearchStore {
  search: string;
  debouncedSearch: string;
  setSearch: (search: string) => void;
  setDebouncedSearch: (v: string) => void;
}

export const useCatalogSearchStore = create<CatalogSearchStore>((set) => ({
  search: '',
  debouncedSearch: '',
  setSearch: (search) => set({ search }),
  setDebouncedSearch: (debouncedSearch) => set({ debouncedSearch }),
}));

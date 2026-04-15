import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type CatalogView = 'list' | 'grid';

interface CatalogViewStore {
  view: CatalogView;
  setView: (view: CatalogView) => void;
}

export const useCatalogViewStore = create<CatalogViewStore>()(
  persist(
    (set) => ({
      view: 'list',
      setView: (view) => set({ view }),
    }),
    { name: 'catalog-view' },
  ),
);

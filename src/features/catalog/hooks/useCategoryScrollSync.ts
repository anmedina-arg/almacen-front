'use client';

import { useRef, useCallback, useEffect } from 'react';

const SCROLL_DEBOUNCE_MS = 150;

interface UseCategoryScrollSyncOptions {
  activeCatName: string | null;
  activeSubName: string | null;
  onActiveCatChange: (name: string | null) => void;
  onActiveSubChange: (name: string | null) => void;
}

interface UseCategoryScrollSyncReturn {
  chipRefs: React.MutableRefObject<Map<string, HTMLAnchorElement>>;
  badgeRefs: React.MutableRefObject<Map<string, HTMLAnchorElement>>;
  subRowRef: React.RefObject<HTMLDivElement | null>;
  handleSubRowScroll: () => void;
}

export function useCategoryScrollSync({
  activeCatName,
  activeSubName,
  onActiveCatChange,
  onActiveSubChange,
}: UseCategoryScrollSyncOptions): UseCategoryScrollSyncReturn {
  const chipRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const badgeRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const subRowRef = useRef<HTMLDivElement>(null);
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Cuando el usuario scrollea el badge row manualmente,
   * inhibimos el auto-scroll de ese row para no interferir.
   */
  const skipBadgeAutoScrollRef = useRef(false);

  const scrollChipIntoView = useCallback((catName: string | null) => {
    if (!catName) return;
    chipRefs.current.get(catName.toLowerCase())?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, []);

  const scrollBadgeIntoView = useCallback((subName: string | null) => {
    if (!subName) return;
    badgeRefs.current.get(subName.toLowerCase())?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, []);

  // Auto-scroll chip row cuando cambia la categoría activa
  useEffect(() => {
    scrollChipIntoView(activeCatName);
  }, [activeCatName, scrollChipIntoView]);

  // Auto-scroll badge row cuando cambia la subcategoría activa
  // (salvo que el cambio venga del scroll horizontal del usuario)
  useEffect(() => {
    if (skipBadgeAutoScrollRef.current) {
      skipBadgeAutoScrollRef.current = false;
      return;
    }
    scrollBadgeIntoView(activeSubName);
  }, [activeSubName, scrollBadgeIntoView]);

  // Detecta qué badge está centrado cuando el usuario scrollea el badge row
  const handleSubRowScroll = useCallback(() => {
    if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);

    scrollDebounceRef.current = setTimeout(() => {
      const rowEl = subRowRef.current;
      if (!rowEl) return;

      const rowRect = rowEl.getBoundingClientRect();
      const centerX = rowRect.left + rowRect.width / 2;

      let closestBadge: HTMLElement | null = null;
      let minDistance = Infinity;

      rowEl.querySelectorAll<HTMLElement>('[data-subcategory]').forEach((badge) => {
        const rect = badge.getBoundingClientRect();
        const badgeCenterX = rect.left + rect.width / 2;
        const dist = Math.abs(badgeCenterX - centerX);
        if (dist < minDistance) {
          minDistance = dist;
          closestBadge = badge;
        }
      });

      if (!closestBadge) return;
      const found = closestBadge as HTMLElement;

      const cat = found.dataset.category ?? null;
      const sub = found.dataset.subcategory ?? null;

      skipBadgeAutoScrollRef.current = true;
      onActiveCatChange(cat ? cat.toLowerCase() : null);
      onActiveSubChange(sub ? sub.toLowerCase() : null);

      if (cat) scrollChipIntoView(cat.toLowerCase());
    }, SCROLL_DEBOUNCE_MS);
  }, [onActiveCatChange, onActiveSubChange, scrollChipIntoView]);

  return { chipRefs, badgeRefs, subRowRef, handleSubRowScroll };
}

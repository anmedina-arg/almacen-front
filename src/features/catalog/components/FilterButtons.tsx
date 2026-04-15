'use client';

import { useScrollSpy } from '../hooks/useScrollSpy';
import { useCategoryScrollSync } from '../hooks/useCategoryScrollSync';
import { CategoryChip } from './CategoryChip';
import { SubcategoryBadge } from './SubcategoryBadge';
import type { CategoryWithSubsPublic } from '../types/category.types';
import { useRef, useState, useCallback } from 'react';

interface FilterButtonsProps {
  categories: CategoryWithSubsPublic[];
}

export function FilterButtons({ categories }: FilterButtonsProps) {
  const { activeCatName, activeSubName, setActiveCatName, setActiveSubName } = useScrollSpy();

  const { chipRefs, badgeRefs, subRowRef, handleSubRowScroll } = useCategoryScrollSync({
    activeCatName,
    activeSubName,
    onActiveCatChange: setActiveCatName,
    onActiveSubChange: setActiveSubName,
  });

  const chipRowRef = useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = useState(false);

  const handleChipScroll = useCallback(() => {
    const el = chipRowRef.current;
    if (!el) return;
    // 4px de tolerancia para evitar parpadeo por decimales
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  const allSubs = categories.flatMap((cat) =>
    cat.subcategories.map((sub) => ({
      id: sub.id,
      name: sub.name,
      categoryName: cat.name,
      anchor: `#${cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}-${sub.name.toLowerCase()}`,
    })),
  );

  return (
    <div className="flex flex-col">
      {/* Fila 1: chips de categoría */}
      <div className="relative">
        <div
          ref={chipRowRef}
          onScroll={handleChipScroll}
          className="flex gap-2 py-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {categories.map((cat, index) => (
            <CategoryChip
              key={cat.id}
              ref={(el) => {
                if (el) chipRefs.current.set(cat.name.toLowerCase(), el);
                else chipRefs.current.delete(cat.name.toLowerCase());
              }}
              to={`#${cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}`}
              label={cat.name}
              imageUrl={cat.image_url}
              active={activeCatName === cat.name.toLowerCase()}
              priority={index < 3}
            />
          ))}
        </div>

        {/* Fade + chevron: se ocultan al llegar al final */}
        {!atEnd && (
          <>
            <div
              className="absolute right-0 top-0 bottom-0 w-9 pointer-events-none"
              style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.65))' }}
            />
            <div
              className="animate-nudge-right absolute right-1.5 top-1/2 pointer-events-none select-none flex items-center justify-center w-6 h-6 rounded-full bg-gray-700 border-2 border-gray-500 text-white"
              style={{ transform: 'translateY(-50%)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </>
        )}
      </div>

      {/* Fila 2: badges de subcategoría */}
      <div
        ref={subRowRef}
        className="flex gap-1.5 py-1.5 overflow-x-auto"
        onScroll={handleSubRowScroll}
      >
        {allSubs.map((sub) => (
          <SubcategoryBadge
            key={sub.id}
            ref={(el) => {
              if (el) badgeRefs.current.set(sub.name.toLowerCase(), el);
              else badgeRefs.current.delete(sub.name.toLowerCase());
            }}
            href={sub.anchor}
            label={sub.name}
            categoryName={sub.categoryName}
            active={activeSubName === sub.name.toLowerCase()}
          />
        ))}
      </div>
    </div>
  );
}

export default FilterButtons;

'use client';

import { useScrollSpy } from '../hooks/useScrollSpy';
import { useCategoryScrollSync } from '../hooks/useCategoryScrollSync';
import { CategoryChip } from './CategoryChip';
import { SubcategoryBadge } from './SubcategoryBadge';
import type { CategoryWithSubsPublic } from '../types/category.types';

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
      <div className="flex gap-2 py-1 overflow-x-auto">
        {categories.map((cat) => (
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
          />
        ))}
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

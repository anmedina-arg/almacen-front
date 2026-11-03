import { pluralize } from './pluralize';

const normalize = (name: string): string => name.trim().toLowerCase();

/**
 * Una categoría con una sola subcategoría que se llama igual (ej. "Gaseosas"
 * con la subcategoría "Gaseosas") muestra un solo título en vez de repetirlo
 * (#174). Con varias subcategorías, o con una de otro nombre, se mantienen sus
 * subtítulos.
 */
export function hasSingleSameNameSubcategory(
  categoryName: string,
  subcategoryNames: string[]
): boolean {
  return (
    subcategoryNames.length === 1 &&
    normalize(subcategoryNames[0]) === normalize(categoryName)
  );
}

export const formatProductCount = (count: number): string =>
  pluralize(count, 'producto', 'productos');

export const formatCategoryCount = (count: number): string =>
  pluralize(count, 'categoría', 'categorías');

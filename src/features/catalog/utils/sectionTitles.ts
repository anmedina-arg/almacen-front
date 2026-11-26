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

/**
 * Título del grupo de un producto dentro de su categoría: el nombre de su
 * subcategoría o, si no tiene, el de su categoría (#181 retiró el texto libre
 * legacy que se usaba antes de caer en 'General').
 */
export function resolveSubcategoryLabel(
  subcategoryName: string | null | undefined,
  categoryName: string
): string {
  const name = subcategoryName?.trim();
  return name ? name : categoryName;
}

export interface SubcategoryGroup<T> {
  /** Clave estable para React y el id del DOM: no distingue mayúsculas ni espacios. */
  key: string;
  /** Título visible: el de la primera aparición del grupo. */
  label: string;
  items: T[];
}

/**
 * Agrupa los productos de una categoría por subcategoría, en orden de
 * aparición. Los que no tienen subcategoría van bajo el nombre de la
 * categoría. Agrupa por la clave normalizada para que "Gaseosas" y "gaseosas"
 * sean un solo grupo y no dos con la misma clave.
 */
export function groupBySubcategory<T extends { subcategory_name?: string | null }>(
  products: T[],
  categoryName: string
): SubcategoryGroup<T>[] {
  const groups = new Map<string, SubcategoryGroup<T>>();
  for (const product of products) {
    const label = resolveSubcategoryLabel(product.subcategory_name, categoryName);
    const key = normalize(label);
    const group = groups.get(key);
    if (group) group.items.push(product);
    else groups.set(key, { key, label, items: [product] });
  }
  return Array.from(groups.values());
}

export const formatProductCount =(count: number): string =>
  pluralize(count, 'producto', 'productos');

export const formatCategoryCount = (count: number): string =>
  pluralize(count, 'categoría', 'categorías');

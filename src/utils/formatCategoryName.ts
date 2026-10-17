/**
 * Texto a mostrar para la categoría de un producto (`category_name`, FK a
 * `categories`). Un producto sin `category_id` no tiene nombre de categoría:
 * en producción solo quedan inactivos en esa situación (#133, 2026-10-17),
 * pero la UI tiene que poder mostrarlos igual para que el admin los pueda
 * encontrar y asignarles una.
 *
 * Único lugar que decide el placeholder — lo usan la lista de productos del
 * admin, las pantallas de stock y el dashboard de inventario (que además
 * agrupa por este texto, así que tiene que ser el mismo en todos lados).
 */
export const SIN_CATEGORIA_LABEL = 'Sin categoría';

export function formatCategoryName(name: string | null | undefined): string {
  return name ?? SIN_CATEGORIA_LABEL;
}

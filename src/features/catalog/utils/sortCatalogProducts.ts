import type { Product } from '../types';
import { isSinStock } from './sinStock';

/**
 * Orden de los productos dentro de una subcategoría del catálogo:
 * no Sin stock primero → Más vendido → orden con el que ya llegan (alfabético
 * por nombre, lo da la consulta). Pura: no muta el arreglo de entrada.
 */
export function sortCatalogProducts<T extends Product>(products: readonly T[]): T[] {
  return [...products].sort(
    (a, b) =>
      Number(isSinStock(a)) - Number(isSinStock(b)) ||
      Number(Boolean(b.is_top_seller)) - Number(Boolean(a.is_top_seller)),
  );
}

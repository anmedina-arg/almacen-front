import type { Product } from '../types';

/**
 * Sin stock (ver CONTEXT.md): el Disponible del producto es 0.
 * Un producto sin dato de stock (`stock_quantity` undefined: la Store no lleva
 * Control de stock) nunca está Sin stock. Única definición compartida por el
 * orden del catálogo y las tarjetas (cartel / precio) — no repetir la
 * comparación en otro lado.
 */
export function isSinStock(product: Pick<Product, 'stock_quantity'>): boolean {
  return product.stock_quantity === 0;
}

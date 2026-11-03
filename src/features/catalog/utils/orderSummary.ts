import type { CartItem } from '../types';
import { pluralize } from './pluralize';
import { calculateLineTotal } from './productUtils';

export type OrderSummaryItem = Pick<CartItem, 'id' | 'quantity' | 'isByWeight'>;

export interface OrderSummary {
  products: number;
  units: number;
}

/**
 * Cuenta productos distintos y unidades del pedido (#171).
 *
 * Un producto por peso cuenta siempre 1 unidad sin importar los gramos: su
 * `quantity` está en gramos y no es comparable con una unidad (decidido por
 * Andrés el 2026-11-03, ver docs/design/catalogo.md). Un Producto Surtido
 * puede tener varias líneas con el mismo id y es un solo producto.
 */
export function getOrderSummary(items: OrderSummaryItem[]): OrderSummary {
  const productIds = new Set<number>();
  const weightProductIds = new Set<number>();
  let unitLineQuantity = 0;

  for (const item of items) {
    productIds.add(item.id);
    if (item.isByWeight) {
      weightProductIds.add(item.id);
    } else {
      unitLineQuantity += item.quantity;
    }
  }

  return { products: productIds.size, units: unitLineQuantity + weightProductIds.size };
}

/** Texto para mostrar el resumen: "2 productos · 3 unidades". */
export function formatOrderSummary({ products, units }: OrderSummary): string {
  return `${pluralize(products, 'producto', 'productos')} · ${pluralize(units, 'unidad', 'unidades')}`;
}

export type OrderTotalItem = Pick<CartItem, 'quantity' | 'saleType' | 'unitPrice'>;

/** Total del pedido en pesos, con el mismo cálculo por peso que arma el mensaje de WhatsApp. */
export function getOrderTotal(items: OrderTotalItem[]): number {
  return items.reduce(
    (sum, item) => sum + calculateLineTotal(item.quantity, item.saleType, item.unitPrice),
    0
  );
}

/** Total para mostrar, escrito como los precios del catálogo ("$6000"), sin ruido de coma flotante. */
export function formatOrderTotal(total: number): string {
  return `$${Number(total.toFixed(2))}`;
}

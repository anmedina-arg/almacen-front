import { formatQuantity } from '@/utils/formatQuantity';
import type { OrderItem } from '../types/order.types';

/**
 * Calculates margin for a single order item.
 * Used in both orders detail view and sales tab.
 */
export function computeMargin(
  unitPrice: number,
  unitCost: number,
  subtotal: number,
): { margin: number; marginPct: number } {
  const marginPct = unitPrice > 0 ? ((unitPrice - unitCost) / unitPrice) * 100 : 0;
  const margin = subtotal * (marginPct / 100);
  return { margin, marginPct };
}

/**
 * Texto del Faltante de un ítem (#162) para el detalle del pedido: "Pidió 3,
 * había 1", en las unidades que ve el Store admin (gr/kg por peso, unidades
 * o combos). null si el ítem no tiene Faltante (0, o NULL porque la Store no
 * llevaba Control de stock al crear el pedido). Un ítem anterior a #162 no
 * guardó lo pedido: muestra solo el Faltante.
 */
export function describeShortfall(
  item: Pick<OrderItem, 'shortfall' | 'ordered_quantity' | 'is_by_weight'>,
): string | null {
  const shortfall = Number(item.shortfall);
  if (!(shortfall > 0)) return null;
  const format = (quantity: number) => formatQuantity(quantity, item.is_by_weight ? 'kg' : 'unit');
  if (item.ordered_quantity == null) return `Faltaban ${format(shortfall)}`;
  const ordered = Number(item.ordered_quantity);
  return `Pidió ${format(ordered)}, había ${format(ordered - shortfall)}`;
}

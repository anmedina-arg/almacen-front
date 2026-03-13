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

'use client';

import { formatPrice } from "@/utils/formatPrice";
export { computeMargin } from '../../utils/orderUtils';

interface MarginDisplayProps {
  /** null o ausente = sin costo registrado: no hay margen que mostrar (#186). */
  margin: number | null | undefined;
  marginPct: number | null | undefined;
  label?: string;
  /** Solo algunos ítems del pedido tienen costo: el margen es de esos ítems. */
  partial?: boolean;
}

export function MarginDisplay({ margin, marginPct, label, partial }: MarginDisplayProps) {
  if (margin == null) {
    return (
      <span className="text-xs font-medium text-amber-500">
        {label && <span className="font-sans text-gray-600">{label}: </span>}sin costo
      </span>
    );
  }
  const isPositive = margin >= 0;
  return (
    <span className={`font-mono font-semibold text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {label && <span className="font-sans font-medium">{label}: </span>}
      {formatPrice(margin)}{' '}
      <span className="text-xs font-normal">({(marginPct ?? 0).toFixed(1)}%)</span>
      {partial && <span className="ml-1 text-xs font-normal text-amber-600" title="Solo cuenta los ítems con costo registrado">parcial</span>}
    </span>
  );
}

'use client';

import { formatPrice } from "@/utils/formatPrice";
export { computeMargin } from '../../utils/orderUtils';

interface MarginDisplayProps {
  margin: number;
  marginPct: number;
  label?: string;
}

export function MarginDisplay({ margin, marginPct, label }: MarginDisplayProps) {
  const isPositive = margin >= 0;
  return (
    <span className={`font-mono font-semibold text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {label && <span className="font-sans font-medium">{label}: </span>}
      {formatPrice(margin)}{' '}
      <span className="text-xs font-normal">({marginPct.toFixed(1)}%)</span>
    </span>
  );
}

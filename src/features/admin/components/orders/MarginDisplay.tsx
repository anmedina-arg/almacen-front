'use client';

export function computeMargin(
  unitPrice: number,
  unitCost: number,
  subtotal: number
): { margin: number; marginPct: number } {
  const marginPct = unitPrice > 0 ? ((unitPrice - unitCost) / unitPrice) * 100 : 0;
  const margin = subtotal * (marginPct / 100);
  return { margin, marginPct };
}

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
      ${margin.toFixed(2)}{' '}
      <span className="text-xs font-normal">({marginPct.toFixed(1)}%)</span>
    </span>
  );
}

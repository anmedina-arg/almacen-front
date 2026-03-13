'use client';

import { useMemo } from 'react';
import type { Order } from '../../types/order.types';
import { formatPrice } from '@/utils/formatPrice';

interface SalesSummaryProps {
  orders: Order[];
}

export function SalesSummary({ orders }: SalesSummaryProps) {
  const stats = useMemo(() => {
    const count = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalCost = orders.reduce((sum, o) => sum + (o.total_cost ?? 0), 0);
    const totalMargin = totalRevenue - totalCost;
    const marginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;
    return { count, totalRevenue, totalCost, totalMargin, marginPct };
  }, [orders]);

  const isPositive = stats.totalMargin >= 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <SummaryCard label="Ventas" value={String(stats.count)} mono={false} />
      <SummaryCard label="Total vendido" value={formatPrice(stats.totalRevenue)} />
      <SummaryCard label="Costo total" value={formatPrice(stats.totalCost)} />
      <SummaryCard
        label="Margen"
        value={`${formatPrice(stats.totalMargin)} (${stats.marginPct.toFixed(1)}%)`}
        color={isPositive ? 'green' : 'red'}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  mono = true,
  color,
}: {
  label: string;
  value: string;
  mono?: boolean;
  color?: 'green' | 'red';
}) {
  const valueColor =
    color === 'green'
      ? 'text-green-600'
      : color === 'red'
        ? 'text-red-600'
        : 'text-gray-800';

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className={`text-lg font-bold ${mono ? 'font-mono' : ''} ${valueColor}`}>{value}</p>
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import type { Order } from '../../types/order.types';
import { formatPrice } from '@/utils/formatPrice';
import { useFeatureFlags } from '../../context/FeatureFlagsContext';
import { CostCoverageNotice } from '../orders/CostCoverageNotice';

interface SalesSummaryProps {
  orders: Order[];
}

export function SalesSummary({ orders }: SalesSummaryProps) {
  const { costos } = useFeatureFlags();

  const stats = useMemo(() => {
    const count = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    // El margen cuenta solo los pedidos con costo registrado (#186): un pedido sin
    // costo no suma, y no se resta de un total vendido que sí lo incluye.
    const withCost = orders.filter((o) => o.margin != null && o.total_cost != null);
    const totalCost = withCost.reduce((sum, o) => sum + (o.total_cost ?? 0), 0);
    const totalMargin = withCost.reduce((sum, o) => sum + (o.margin ?? 0), 0);
    const coveredRevenue = totalCost + totalMargin;
    const marginPct = coveredRevenue > 0 ? (totalMargin / coveredRevenue) * 100 : 0;
    return { count, totalRevenue, totalCost, totalMargin, marginPct, withCostCount: withCost.length };
  }, [orders]);

  const isPositive = stats.totalMargin >= 0;
  const partialMargin = stats.withCostCount < stats.count;

  return (
    <div className="space-y-3">
      {costos && <CostCoverageNotice orders={orders} />}
      <div className={`grid grid-cols-2 gap-3 ${costos ? 'sm:grid-cols-4' : 'sm:grid-cols-2'}`}>
        <SummaryCard label="Ventas" value={String(stats.count)} mono={false} />
        <SummaryCard label="Total vendido" value={formatPrice(stats.totalRevenue)} />
        {costos && (
          <>
            <SummaryCard label="Costo total" value={stats.withCostCount > 0 ? formatPrice(stats.totalCost) : 'sin costo'} />
            <SummaryCard
              label="Margen"
              value={stats.withCostCount > 0 ? `${formatPrice(stats.totalMargin)} (${stats.marginPct.toFixed(1)}%)` : 'sin costo'}
              color={stats.withCostCount > 0 ? (isPositive ? 'green' : 'red') : undefined}
              note={partialMargin && stats.withCostCount > 0 ? `Sobre ${stats.withCostCount} de ${stats.count} ventas con costo` : undefined}
            />
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  mono = true,
  color,
  note,
}: {
  label: string;
  value: string;
  mono?: boolean;
  color?: 'green' | 'red';
  note?: string;
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
      {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
    </div>
  );
}

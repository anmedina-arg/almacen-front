'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useStockValueHistory } from '../../hooks/useStockValueHistory';

// Paleta de colores distinguibles para las categorías
const PALETTE = [
  '#16a34a', '#2563eb', '#dc2626', '#d97706', '#7c3aed',
  '#0891b2', '#be185d', '#65a30d', '#ea580c', '#0f766e',
  '#6d28d9', '#b45309',
];

function formatARS(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLabel(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

interface TooltipEntry {
  dataKey?: string;
  name?: string;
  value?: number;
  fill?: string;
}

function SegmentTooltip({ active, payload, label, activeCategory }: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  activeCategory: string | null;
}) {
  if (!active || !payload || !activeCategory) return null;
  const item = payload.find((p) => p.dataKey === activeCategory);
  if (!item || item.value == null) return null;
  return (
    <div style={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', padding: '8px 12px' }}>
      <p className="text-gray-500 mb-1">{label}</p>
      <p style={{ color: item.fill }} className="font-semibold">
        {item.name}: {formatARS(Number(item.value))}
      </p>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
      <div className="h-8 w-36 bg-gray-200 rounded mb-6" />
      <div className="h-56 bg-gray-100 rounded" />
    </div>
  );
}

export function StockValueHistoryChart() {
  const { data, isLoading, isError } = useStockValueHistory();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Transformar a formato Recharts: [{ date, Cat1: val, Cat2: val, ... }]
  const chartData = data
    ? data.dates.map((date) => {
        const row: Record<string, string | number> = { date: formatDateLabel(date) };
        for (const cat of data.categories) {
          const found = data.items.find((i) => i.date === date && i.category === cat);
          row[cat] = found?.value ?? 0;
        }
        return row;
      })
    : [];

  const total = data
    ? data.items
        .filter((i) => {
          const lastDate = data.dates[data.dates.length - 1];
          return i.date === lastDate;
        })
        .reduce((acc, i) => acc + i.value, 0)
    : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Capital en stock — últimos 7 días
          </h2>
          {!isLoading && data && (
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatARS(total)}</p>
          )}
          {isLoading && <div className="h-8 w-36 bg-gray-200 rounded animate-pulse mt-0.5" />}
        </div>
        <span className="text-xs text-gray-400 mt-1">valorizado al costo por categoría</span>
      </div>

      {isLoading && (
        <div className="mt-4">
          <ChartSkeleton />
        </div>
      )}

      {isError && (
        <div className="text-sm text-red-500 bg-red-50 p-4 mt-4 rounded-lg border border-red-200">
          Error al cargar el historial de stock.
        </div>
      )}

      {data && data.items.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-10">
          No hay datos de stock para los últimos 7 días.
        </p>
      )}

      {data && data.items.length > 0 && (
        <div className="mt-4" style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatARS(v)}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                content={(props) => (
                  <SegmentTooltip
                    active={props.active}
                    payload={props.payload as unknown as TooltipEntry[] | undefined}
                    label={props.label as string | undefined}
                    activeCategory={activeCategory}
                  />
                )}
                cursor={{ fill: '#f9fafb' }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                iconType="square"
                iconSize={10}
              />
              {data.categories.map((cat, idx) => (
                <Bar
                  key={cat}
                  dataKey={cat}
                  stackId="stock"
                  fill={PALETTE[idx % PALETTE.length]}
                  radius={idx === data.categories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  maxBarSize={60}
                  onMouseEnter={() => setActiveCategory(cat)}
                  onMouseLeave={() => setActiveCategory(null)}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

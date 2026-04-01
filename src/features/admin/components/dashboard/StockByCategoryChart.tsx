'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { StockByCategoryItem } from '@/app/api/dashboard/stock-by-category/route';

const COLORS = [
  '#16a34a', '#15803d', '#166534', '#22c55e', '#4ade80',
  '#86efac', '#bbf7d0', '#dcfce7',
];

const COLORS_SELECTED = [
  '#15803d', '#14532d', '#14532d', '#16a34a', '#22c55e',
  '#4ade80', '#86efac', '#bbf7d0',
];

function formatARS(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value);
}

interface Props {
  data: StockByCategoryItem[];
  selectedCategory: string | null;
  onCategoryClick: (category: string) => void;
}

export function StockByCategoryChart({ data, selectedCategory, onCategoryClick }: Props) {
  const total = data.reduce((sum, d) => sum + d.total_value, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Stock valorizado por categoría
          </h2>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{formatARS(total)}</p>
        </div>
        <span className="text-xs text-gray-400 mt-1">Click en una barra para ver detalle</span>
      </div>

      <div className="mt-4" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => formatARS(v)}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="category_name"
              width={110}
              tick={{ fontSize: 12, fill: '#374151' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => [formatARS(Number(value)), 'Valor en stock']}
              contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #e5e7eb' }}
              cursor={{ fill: '#f0fdf4' }}
            />
            <Bar
              dataKey="total_value"
              radius={[0, 4, 4, 0]}
              maxBarSize={32}
              cursor="pointer"
              onClick={(barData) => onCategoryClick((barData as unknown as StockByCategoryItem).category_name)}
            >
              {data.map((item, index) => {
                const isSelected = item.category_name === selectedCategory;
                return (
                  <Cell
                    key={index}
                    fill={isSelected ? COLORS_SELECTED[index % COLORS_SELECTED.length] : COLORS[index % COLORS.length]}
                    opacity={selectedCategory && !isSelected ? 0.4 : 1}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useInventoryRotation } from '../../hooks/useInventoryRotation';
import type { RotationItem } from '@/app/api/dashboard/rotation/route';

const PERIODS = [
  { label: '7 días',  value: 7  },
  { label: '15 días', value: 15 },
  { label: '30 días', value: 30 },
  { label: '60 días', value: 60 },
  { label: '90 días', value: 90 },
];

function formatQty(raw: number, saleType: string): string {
  switch (saleType) {
    case 'kg':    return `${(raw / 1000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} kg`;
    case '100gr': return `${raw.toLocaleString('es-AR', { maximumFractionDigits: 0 })} gr`;
    default:      return `${raw.toLocaleString('es-AR', { maximumFractionDigits: 1 })} u`;
  }
}

function RotationBadge({ rotation }: { rotation: number }) {
  if (rotation >= 1)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Alta</span>;
  if (rotation >= 0.3)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Media</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Baja</span>;
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2 p-5">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-8 bg-gray-100 rounded" />
      ))}
    </div>
  );
}

export function InventoryRotationTable() {
  const [days, setDays] = useState(7);
  const { data, isLoading, isError } = useInventoryRotation(days);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-6">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Rotación de inventario
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">ventas / stock promedio del período</p>
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setDays(p.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                days === p.value
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <TableSkeleton />}

      {isError && (
        <div className="text-sm text-red-500 bg-red-50 p-4 m-4 rounded-lg border border-red-200">
          Error al cargar los datos de rotación.
        </div>
      )}

      {data && data.length === 0 && (
        <p className="text-sm text-gray-400 text-center p-8">
          No hay ventas registradas en los últimos {days} días.
        </p>
      )}

      {data && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left w-8">#</th>
                <th className="px-4 py-3 text-left">Producto</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Categoría</th>
                <th className="px-4 py-3 text-right">Ventas</th>
                <th className="px-4 py-3 text-right hidden md:table-cell">Stock prom.</th>
                <th className="px-4 py-3 text-right">Rotación</th>
                <th className="px-4 py-3 text-center">Nivel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((item: RotationItem, index: number) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{index + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{item.name}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs hidden sm:table-cell">{item.category_name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                    {formatQty(item.units_sold, item.sale_type)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-500 hidden md:table-cell">
                    {formatQty(item.avg_stock, item.sale_type)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-gray-900">
                    {item.rotation.toFixed(2)}x
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <RotationBadge rotation={item.rotation} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

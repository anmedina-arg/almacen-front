'use client';

import React, { useState } from 'react';
import { useInventoryRotation } from '../../hooks/useInventoryRotation';
import { useProductStockSnapshots } from '../../hooks/useProductStockSnapshots';
import type { RotationItem } from '@/app/api/dashboard/rotation/route';

const PERIODS = [
  { label: '7 días',  value: 7  },
  { label: '15 días', value: 15 },
  { label: '30 días', value: 30 },
];

function formatQty(raw: number, saleType: string): string {
  switch (saleType) {
    case 'kg':    return `${(raw / 1000).toLocaleString('es-AR', { maximumFractionDigits: 2 })} kg`;
    case '100gr': return `${raw.toLocaleString('es-AR', { maximumFractionDigits: 0 })} gr`;
    default:      return `${raw.toLocaleString('es-AR', { maximumFractionDigits: 1 })} u`;
  }
}

function rotationLabel(rotation: number): string {
  if (rotation >= 1) return 'Alta';
  if (rotation >= 0.3) return 'Media';
  return 'Baja';
}

function downloadCSV(data: RotationItem[], days: number) {
  const headers = ['#', 'Producto', 'Categoría', 'Tipo', 'Ventas', 'Stock promedio', 'Rotación', 'Nivel'];
  const rows = data.map((item, i) => [
    i + 1,
    item.name,
    item.category_name,
    item.sale_type,
    formatQty(item.units_sold, item.sale_type),
    formatQty(item.avg_stock, item.sale_type),
    `${item.rotation.toFixed(2)}x`,
    rotationLabel(item.rotation),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rotacion_${days}dias_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function RotationBadge({ rotation }: { rotation: number }) {
  if (rotation >= 1)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Alta</span>;
  if (rotation >= 0.3)
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Media</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Baja</span>;
}

const MOVEMENT_LABELS: Record<string, string> = {
  sale:             'Venta',
  purchase:         'Compra',
  initial_count:    'Carga inicial',
  manual_adjustment:'Ajuste manual',
  return:           'Devolución',
  loss:             'Pérdida',
  correction:       'Corrección',
  actual:           'Stock actual',
};

function SnapshotsRow({ productId, colSpan }: { productId: number; colSpan: number }) {
  const { data, isLoading, isError } = useProductStockSnapshots(productId);

  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        {isLoading && (
          <div className="animate-pulse flex gap-2">
            {[...Array(7)].map((_, i) => <div key={i} className="h-12 w-20 bg-gray-200 rounded" />)}
          </div>
        )}
        {isError && (
          <p className="text-xs text-red-500">Error al cargar historial de stock.</p>
        )}
        {data && (
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="text-gray-400 uppercase tracking-wide">
                  <th className="text-left pr-6 pb-1 font-medium">Fecha</th>
                  <th className="text-right pr-6 pb-1 font-medium">Stock cierre</th>
                  <th className="text-left pb-1 font-medium">Último movimiento</th>
                </tr>
              </thead>
              <tbody>
                {data.map((snap) => (
                  <tr key={snap.date} className="border-t border-gray-100">
                    <td className="pr-6 py-1 text-gray-600 tabular-nums">{snap.date}</td>
                    <td className="pr-6 py-1 text-right tabular-nums font-semibold text-gray-800">
                      {snap.stock !== null ? snap.stock : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-1 text-gray-500">
                      {snap.movement_type ? (MOVEMENT_LABELS[snap.movement_type] ?? snap.movement_type) : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </td>
    </tr>
  );
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

interface Props {
  // Cuando se proveen desde el contenedor padre (Nivel 3 del dashboard),
  // el componente actúa como pure view: no fetchea, no muestra selector de período.
  externalData?: RotationItem[];
  externalDays?: number;
}

export function InventoryRotationTable({ externalData, externalDays }: Props = {}) {
  const [days, setDays] = useState(7);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const isExternal = externalData !== undefined;

  // El hook siempre se llama (reglas de React), pero cuando hay datos externos
  // el resultado se ignora — TanStack Query retorna desde caché sin refetch.
  const { data: hookData, isLoading: hookLoading, isError: hookError } = useInventoryRotation(days);

  const data      = isExternal ? externalData : hookData;
  const isLoading = isExternal ? false : hookLoading;
  const isError   = isExternal ? false : hookError;
  const csvDays   = externalDays ?? days;
  const effectiveDays = externalDays ?? days;
  const canExpand = effectiveDays === 7;
  // Número de columnas visibles (para el colSpan del panel expandido)
  const COL_SPAN = 7;

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
        <div className="flex items-center gap-2">
          {!isExternal && (
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
          )}
          {data && data.length > 0 && (
            <button
              onClick={() => downloadCSV(data, csvDays)}
              title="Descargar CSV"
              className="p-1.5 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          )}
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
          No hay productos en este segmento.
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
              {data.map((item: RotationItem, index: number) => {
                const isExpanded = expandedId === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <tr
                      onClick={() => canExpand && setExpandedId(isExpanded ? null : item.id)}
                      className={`transition-colors ${canExpand ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{index + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800">
                        <span className="flex items-center gap-1.5">
                          {item.name}
                          {canExpand && (
                            <svg
                              className={`w-3 h-3 text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </span>
                      </td>
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
                    {isExpanded && (
                      <SnapshotsRow productId={item.id} colSpan={COL_SPAN} />
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

'use client';

import type { StockProductItem } from '@/app/api/dashboard/stock-products/route';

const ARS = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

function formatStock(raw: number, saleType: string): string {
  switch (saleType) {
    case 'kg':    return `${(raw / 1000).toLocaleString('es-AR', { maximumFractionDigits: 3 })} kg`;
    case '100gr': return `${raw.toLocaleString('es-AR')} gr`;
    default:      return `${raw.toLocaleString('es-AR')} u`;
  }
}

function formatCost(cost: number, saleType: string): string {
  switch (saleType) {
    case 'kg':    return `${ARS(cost)}/kg`;
    case '100gr': return `${ARS(cost)}/100gr`;
    default:      return ARS(cost);
  }
}

interface Props {
  category: string;
  data: StockProductItem[];
  onClose: () => void;
}

export function StockProductsTable({ category, data, onClose }: Props) {
  const total = data.reduce((sum, p) => sum + p.stock_value, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mt-4">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-800">{category}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{data.length} productos · Total {ARS(total)}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
          aria-label="Cerrar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <th className="px-5 py-3 text-left">Producto</th>
              <th className="px-5 py-3 text-right">Stock</th>
              <th className="px-5 py-3 text-right">Costo unit.</th>
              <th className="px-5 py-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 text-gray-800 font-medium">{p.name}</td>
                <td className="px-5 py-3 text-right text-gray-600 tabular-nums">
                  {formatStock(p.stock_raw, p.sale_type)}
                </td>
                <td className="px-5 py-3 text-right text-gray-600 tabular-nums">
                  {formatCost(p.cost, p.sale_type)}
                </td>
                <td className="px-5 py-3 text-right font-semibold text-gray-900 tabular-nums">
                  {ARS(p.stock_value)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t border-gray-200">
              <td colSpan={3} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Total</td>
              <td className="px-5 py-3 text-right font-bold text-gray-900 tabular-nums">{ARS(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

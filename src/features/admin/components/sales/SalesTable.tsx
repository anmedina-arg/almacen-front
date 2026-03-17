'use client';

import type { Order } from '../../types/order.types';
import { OrderStatusBadge } from '../orders/OrderStatusBadge';
import { MarginDisplay } from '../orders/MarginDisplay';
import { PAYMENT_EMOJI } from '../../types/payment.types';
import { formatAdminDate } from '../../utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';

interface SalesTableProps {
  orders: Order[];
}

export function SalesTable({ orders }: SalesTableProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No hay ventas en el período seleccionado.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow-md border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-4 font-semibold text-gray-600">ID</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Cliente</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Pago</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Fecha</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-600">Estado</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600">Costo</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600">Precio de venta</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600">Margen</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-mono font-medium text-gray-800">#{order.id}</td>
                <td className="py-3 px-4">
                  {order.client ? (
                    <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                      {order.client.display_code}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {(order.order_payments ?? []).length > 0 ? (
                    <span className="text-base">
                      {(order.order_payments ?? []).map((p) => PAYMENT_EMOJI[p.method]).join(' ')}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-gray-600">{formatAdminDate(order.created_at)}</td>
                <td className="py-3 px-4 text-center">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="py-3 px-4 text-right font-mono text-gray-700">
                  {order.total_cost !== undefined ? formatPrice(order.total_cost) : <span className="text-gray-400 text-xs">—</span>}
                </td>
                <td className="py-3 px-4 text-right font-mono font-semibold text-gray-800">
                  {formatPrice(order.total)}
                </td>
                <td className="py-3 px-4 text-right">
                  {order.margin !== undefined ? (
                    <MarginDisplay margin={order.margin} marginPct={order.margin_pct ?? 0} />
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-lg shadow-md border border-gray-200 p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="font-mono font-bold text-gray-800">
                <span>Pedido #{order.id}</span>
                {order.client && (
                  <span className="ml-1.5 text-indigo-600 font-semibold text-sm">
                    · {order.client.display_code}
                  </span>
                )}
              </div>
              <OrderStatusBadge status={order.status} />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500">{formatAdminDate(order.created_at)}</p>
              {(order.order_payments ?? []).length > 0 && (
                <span className="text-base">
                  {(order.order_payments ?? []).map((p) => PAYMENT_EMOJI[p.method]).join(' ')}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-400">Costo</p>
                <p className="font-mono font-medium text-gray-700">
                  {order.total_cost !== undefined ? formatPrice(order.total_cost) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Precio de venta</p>
                <p className="font-mono font-semibold text-gray-800">{formatPrice(order.total)}</p>
              </div>
            </div>
            {order.margin !== undefined && (
              <div>
                <p className="text-xs text-gray-400">Margen</p>
                <MarginDisplay margin={order.margin} marginPct={order.margin_pct ?? 0} />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { useOrders } from '../../hooks/useOrders';
import { ClientAssignCell } from '../orders/ClientAssignCell';
import { PaymentCell } from '../orders/PaymentCell';
import { OrderStatusBadge } from '../orders/OrderStatusBadge';
import { OrderDetailModal } from '../orders/OrderDetailModal';
import { formatAdminDate } from '../../utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import type { Order } from '../../types/order.types';

function orderDebe(order: Pick<Order, 'total' | 'order_payments'>): boolean {
  const payments = order.order_payments ?? [];
  if (payments.length === 0) return true;
  const amountsWithValue = payments.filter((p) => p.amount !== null);
  if (amountsWithValue.length === 0) return false;
  const paid = amountsWithValue.reduce((acc, p) => acc + (p.amount ?? 0), 0);
  return order.total - paid > 0;
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2 p-5">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-10 bg-gray-100 rounded" />
      ))}
    </div>
  );
}

export function PendingPaymentsTable() {
  const { data: orders, isLoading, isError } = useOrders();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const pendingOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter(
      (o) => o.status !== 'cancelled' && orderDebe(o)
    );
  }, [orders]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Pedidos pendientes de pago
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">solo pedidos con saldo a cobrar</p>
        </div>
        {!isLoading && pendingOrders.length > 0 && (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            {pendingOrders.length} {pendingOrders.length === 1 ? 'pedido' : 'pedidos'}
          </span>
        )}
      </div>

      {isLoading && <TableSkeleton />}

      {isError && (
        <div className="text-sm text-red-500 bg-red-50 p-4 m-4 rounded-lg border border-red-200">
          Error al cargar los pedidos.
        </div>
      )}

      {!isLoading && !isError && pendingOrders.length === 0 && (
        <p className="text-sm text-gray-400 text-center p-8">
          No hay pedidos con saldo pendiente.
        </p>
      )}

      {!isLoading && pendingOrders.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Pedido</th>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Pago</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <td className="px-4 py-3 font-mono font-medium text-gray-800 whitespace-nowrap">
                      #{order.id}
                      {order.client && (
                        <span className="text-indigo-600 font-semibold"> · {order.client.display_code}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatAdminDate(order.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gray-800">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <ClientAssignCell orderId={order.id} client={order.client} />
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <PaymentCell
                        orderId={order.id}
                        orderTotal={order.total}
                        payments={order.order_payments ?? []}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedOrderId(order.id); }}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3 p-4">
            {pendingOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg border border-gray-200 p-4 space-y-3 cursor-pointer hover:border-red-200 transition-colors"
                onClick={() => setSelectedOrderId(order.id)}
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
                <div onClick={(e) => e.stopPropagation()}>
                  <ClientAssignCell orderId={order.id} client={order.client} />
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <PaymentCell
                    orderId={order.id}
                    orderTotal={order.total}
                    payments={order.order_payments ?? []}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{formatAdminDate(order.created_at)}</span>
                  <span className="font-bold text-gray-800">{formatPrice(order.total)}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedOrderId(order.id); }}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Ver detalle
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePendingPayments } from '../../hooks/usePendingPayments';
import { ClientAssignCell } from '../orders/ClientAssignCell';
import { PaymentCell } from '../orders/PaymentCell';
import { OrderStatusBadge } from '../orders/OrderStatusBadge';
import { OrderDetailModal } from '../orders/OrderDetailModal';
import { formatAdminDate } from '../../utils/formatDate';
import { formatPrice } from '@/utils/formatPrice';
import { adminKeys } from '../../constants/queryKeys';

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-2 p-5">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 bg-gray-100 rounded" />
      ))}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
      <span>{total} pedidos en total</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-2 py-1 rounded disabled:opacity-30 hover:bg-gray-100 transition-colors"
        >
          ‹
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`px-2.5 py-1 rounded transition-colors ${
              p === page ? 'bg-gray-800 text-white font-medium' : 'hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="px-2 py-1 rounded disabled:opacity-30 hover:bg-gray-100 transition-colors"
        >
          ›
        </button>
      </div>
    </div>
  );
}

export function PendingPaymentsTable() {
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = usePendingPayments(page);

  const orders = data?.orders ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // After a mutation (payment assigned), refetch current page
  const handlePaymentChange = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.dashboardPendingPayments(page) });
  };

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
        {!isLoading && total > 0 && (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            {total} {total === 1 ? 'pedido' : 'pedidos'}
          </span>
        )}
      </div>

      {isLoading && <TableSkeleton />}

      {isError && (
        <div className="text-sm text-red-500 bg-red-50 p-4 m-4 rounded-lg border border-red-200">
          Error al cargar los pedidos.
        </div>
      )}

      {!isLoading && !isError && total === 0 && (
        <p className="text-sm text-gray-400 text-center p-8">
          No hay pedidos con saldo pendiente.
        </p>
      )}

      {!isLoading && orders.length > 0 && (
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
                {orders.map((order) => (
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
                        onSuccess={handlePaymentChange}
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
            {orders.map((order) => (
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
                    onSuccess={handlePaymentChange}
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

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onChange={(p) => { setPage(p); }}
          />
        </>
      )}

      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => {
            setSelectedOrderId(null);
            handlePaymentChange();
          }}
        />
      )}
    </div>
  );
}

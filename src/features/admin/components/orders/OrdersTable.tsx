'use client';

import { useState, useMemo } from 'react';
import { useOrders } from '../../hooks/useOrders';
import { useSalesFilters } from '../../hooks/useSalesFilters';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderDetailModal } from './OrderDetailModal';
import { MarginDisplay } from './MarginDisplay';
import { ClientAssignCell } from './ClientAssignCell';
import { PaymentCell } from './PaymentCell';
import { SalesFilters } from '../sales/SalesFilters';
import type { OrderFilters, OrderStatus } from '../../types/order.types';
import { formatAdminDate } from '../../utils/formatDate';
import { Spinner } from '@/components/ui/Spinner';
import { formatPrice } from '@/utils/formatPrice';

/**
 * Main orders management table component.
 * Displays all orders with filtering and detail view.
 */
export function OrdersTable() {
  const { data: orders, isLoading, error } = useOrders();

  const { quickFilter, dateFrom, dateTo, setQuickFilter, setDateFrom, setDateTo, filteredOrders: dateFilteredOrders } =
    useSalesFilters(orders);

  const [filters, setFilters] = useState<OrderFilters>({
    search: '',
    statusFilter: 'all',
    clientFilter: 'all',
    paymentFilter: 'all',
  });

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Unique client options derived from loaded orders
  const clientOptions = useMemo(() => {
    if (!orders) return [];
    const seen = new Set<string>();
    const options: { value: string; label: string }[] = [];
    for (const order of orders) {
      if (order.client) {
        const code = order.client.display_code;
        if (!seen.has(code)) {
          seen.add(code);
          options.push({ value: code, label: code });
        }
      }
    }
    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [orders]);

  // An order "debe" when: no payments at all, or has payments with amounts
  // but the sum doesn't cover the total.
  const orderDebe = (order: { total: number; order_payments?: { amount: number | null }[] }) => {
    const payments = order.order_payments ?? [];
    if (payments.length === 0) return true;
    const amountsWithValue = payments.filter((p) => p.amount !== null);
    if (amountsWithValue.length === 0) return false; // all payments without amount = fully paid
    const paid = amountsWithValue.reduce((acc, p) => acc + (p.amount ?? 0), 0);
    return order.total - paid > 0;
  };

  // Filter orders (applied on top of date filter)
  const filteredOrders = useMemo(() => {
    return dateFilteredOrders.filter((order) => {
      // Status filter
      if (filters.statusFilter !== 'all' && order.status !== filters.statusFilter) {
        return false;
      }

      // Client filter
      if (filters.clientFilter === 'unassigned') {
        if (order.client) return false;
      } else if (filters.clientFilter !== 'all') {
        if (order.client?.display_code !== filters.clientFilter) return false;
      }

      // Payment filter
      if (filters.paymentFilter === 'debe' && !orderDebe(order)) {
        return false;
      }

      // Search filter (by order ID, total or product name)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesId = String(order.id).includes(searchLower);
        const matchesTotal = String(order.total).includes(searchLower);
        const matchesProduct = (order.product_names ?? []).some((name) =>
          name.toLowerCase().includes(searchLower)
        );
        if (!matchesId && !matchesTotal && !matchesProduct) return false;
      }

      return true;
    });
  }, [dateFilteredOrders, filters]);

  // Count by status (within date range)
  const statusCounts = useMemo(() => {
    return {
      pending: dateFilteredOrders.filter((o) => o.status === 'pending').length,
      confirmed: dateFilteredOrders.filter((o) => o.status === 'confirmed').length,
      cancelled: dateFilteredOrders.filter((o) => o.status === 'cancelled').length,
    };
  }, [dateFilteredOrders]);

  const debeCount = useMemo(() => {
    return dateFilteredOrders.filter((o) => o.status !== 'cancelled' && orderDebe(o)).length;
  }, [dateFilteredOrders]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    const errorMessage = (error as Error).message;
    if (
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Admin access required')
    ) {
      return (
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" />
        </div>
      );
    }
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-red-800">Error al cargar pedidos: {errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Pedidos</h2>
          <p className="text-sm text-gray-500">
            Gestion de pedidos recibidos por WhatsApp
          </p>
        </div>
        {statusCounts.pending > 0 && (
          <button
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                statusFilter:
                  prev.statusFilter === 'pending' ? 'all' : 'pending',
              }))
            }
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${filters.statusFilter === 'pending'
                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                : 'bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100'
              }`}
          >
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-200 text-yellow-800 text-xs font-bold">
              {statusCounts.pending}
            </span>
            Pendientes
          </button>
        )}
      </div>

      {/* Date filters */}
      <SalesFilters
        quickFilter={quickFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onQuickFilter={setQuickFilter}
        onDateFrom={setDateFrom}
        onDateTo={setDateTo}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por ID, total o producto..."
          value={filters.search}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, search: e.target.value }))
          }
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />

        <select
          value={filters.statusFilter}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              statusFilter: e.target.value as OrderStatus | 'all',
            }))
          }
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="all">Todos los estados</option>
          <option value="pending">
            Pendientes ({statusCounts.pending})
          </option>
          <option value="confirmed">
            Confirmados ({statusCounts.confirmed})
          </option>
          <option value="cancelled">
            Cancelados ({statusCounts.cancelled})
          </option>
        </select>

        <select
          value={filters.clientFilter}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, clientFilter: e.target.value }))
          }
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="all">Todos los clientes</option>
          <option value="unassigned">Sin cliente</option>
          {clientOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={filters.paymentFilter}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              paymentFilter: e.target.value as 'all' | 'debe',
            }))
          }
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="all">Todos los pagos</option>
          <option value="debe">Debe ({debeCount})</option>
        </select>
      </div>

      {/* Counter */}
      <p className="text-sm text-gray-600">
        Mostrando {filteredOrders.length} de {dateFilteredOrders.length} pedidos
      </p>

      {/* Table Desktop */}
      {filteredOrders.length > 0 ? (
        <>
          <div className="hidden md:block bg-white rounded-lg shadow-md border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    ID
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    Fecha
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">
                    Total
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">
                    Margen
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    Cliente
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    Pago
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">
                    Estado
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-gray-800 whitespace-nowrap">
                      #{order.id}
                      {order.client && (
                        <span className="text-indigo-600 font-semibold"> · {order.client.display_code}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {formatAdminDate(order.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-gray-800">
                      {formatPrice(order.total)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {order.margin === undefined ? (
                        <span className="text-gray-400 text-xs">—</span>
                      ) : (
                        <MarginDisplay
                          margin={order.margin}
                          marginPct={order.margin_pct ?? 0}
                        />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <ClientAssignCell orderId={order.id} client={order.client} />
                    </td>
                    <td className="py-3 px-4">
                      <PaymentCell
                        orderId={order.id}
                        orderTotal={order.total}
                        payments={order.order_payments ?? []}
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrderId(order.id);
                        }}
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

          {/* Cards Mobile */}
          <div className="md:hidden space-y-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-md border border-gray-200 p-4 space-y-3 cursor-pointer hover:border-green-300 transition-colors"
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
                  <span className="text-gray-500">
                    {formatAdminDate(order.created_at)}
                  </span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-gray-800">
                      {formatPrice(order.total)}
                    </span>
                    <div className="mt-0.5">
                      {order.margin === undefined ? (
                        <span className="text-gray-400 text-xs">—</span>
                      ) : (
                        <MarginDisplay
                          margin={order.margin}
                          marginPct={order.margin_pct ?? 0}
                        />
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedOrderId(order.id);
                  }}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Ver detalle
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No se encontraron pedidos con los filtros actuales.
          </p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}

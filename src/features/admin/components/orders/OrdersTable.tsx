'use client';

import { useState, useMemo } from 'react';
import { useOrders } from '../../hooks/useOrders';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderDetailModal } from './OrderDetailModal';
import type { OrderFilters, OrderStatus } from '../../types/order.types';

/**
 * Main orders management table component.
 * Displays all orders with filtering and detail view.
 */
export function OrdersTable() {
  const { data: orders, isLoading, error } = useOrders();

  const [filters, setFilters] = useState<OrderFilters>({
    search: '',
    statusFilter: 'all',
  });

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Filter orders
  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    return orders.filter((order) => {
      // Status filter
      if (filters.statusFilter !== 'all' && order.status !== filters.statusFilter) {
        return false;
      }

      // Search filter (by order ID or total)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesId = String(order.id).includes(searchLower);
        const matchesTotal = String(order.total).includes(searchLower);
        if (!matchesId && !matchesTotal) return false;
      }

      return true;
    });
  }, [orders, filters]);

  // Count by status
  const statusCounts = useMemo(() => {
    if (!orders) return { pending: 0, confirmed: 0, cancelled: 0 };
    return {
      pending: orders.filter((o) => o.status === 'pending').length,
      confirmed: orders.filter((o) => o.status === 'confirmed').length,
      cancelled: orders.filter((o) => o.status === 'cancelled').length,
    };
  }, [orders]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
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
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filters.statusFilter === 'pending'
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por ID o total..."
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
      </div>

      {/* Counter */}
      <p className="text-sm text-gray-600">
        Mostrando {filteredOrders.length} de {orders?.length || 0} pedidos
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
                    <td className="py-3 px-4 font-mono font-medium text-gray-800">
                      #{order.id}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-gray-800">
                      ${Number(order.total).toFixed(2)}
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
                  <span className="font-mono font-bold text-gray-800">
                    Pedido #{order.id}
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {formatDate(order.created_at)}
                  </span>
                  <span className="text-lg font-bold text-gray-800">
                    ${Number(order.total).toFixed(2)}
                  </span>
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

'use client';

import { useOrders } from '../../hooks/useOrders';
import { useSalesFilters } from '../../hooks/useSalesFilters';
import { SalesFilters } from './SalesFilters';
import { SalesSummary } from './SalesSummary';
import { SalesTable } from './SalesTable';
import { Spinner } from '@/components/ui/Spinner';

export function SalesTab() {
  const { data: orders, isLoading, error } = useOrders();

  const { quickFilter, dateFrom, dateTo, setQuickFilter, setDateFrom, setDateTo, filteredOrders } =
    useSalesFilters(orders);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-red-800">Error al cargar ventas: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Ventas</h2>
        <p className="text-sm text-gray-500">Historial de pedidos con desglose financiero</p>
      </div>

      {/* Filters */}
      <SalesFilters
        quickFilter={quickFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onQuickFilter={setQuickFilter}
        onDateFrom={setDateFrom}
        onDateTo={setDateTo}
      />

      {/* Summary */}
      <SalesSummary orders={filteredOrders} />

      {/* Count */}
      <p className="text-sm text-gray-600">
        Mostrando {filteredOrders.length} de {orders?.length ?? 0} pedidos
      </p>

      {/* Table */}
      <SalesTable orders={filteredOrders} />
    </div>
  );
}

'use client';

import { useStockByCategory } from '../../hooks/useStockByCategory';
import { StockByCategoryChart } from './StockByCategoryChart';

export function DashboardPanel() {
  const { data, isLoading, isError } = useStockByCategory();

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Dashboard</h1>

      {isLoading && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm animate-pulse">
          <div className="h-4 w-48 bg-gray-200 rounded mb-3" />
          <div className="h-8 w-36 bg-gray-200 rounded mb-6" />
          <div className="h-64 bg-gray-100 rounded" />
        </div>
      )}

      {isError && (
        <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-4">
          Error al cargar los datos de stock.
        </div>
      )}

      {data && <StockByCategoryChart data={data} />}
    </div>
  );
}

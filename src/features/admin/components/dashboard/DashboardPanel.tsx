'use client';

import dynamic from 'next/dynamic';
import { useStockByCategory } from '../../hooks/useStockByCategory';

const StockByCategoryChart = dynamic(
  () => import('./StockByCategoryChart').then((m) => ({ default: m.StockByCategoryChart })),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm animate-pulse">
      <div className="h-4 w-48 bg-gray-200 rounded mb-3" />
      <div className="h-8 w-36 bg-gray-200 rounded mb-6" />
      <div className="h-64 bg-gray-100 rounded" />
    </div>
  );
}

export function DashboardPanel() {
  const { data, isLoading, isError } = useStockByCategory();

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Dashboard</h1>

      {isLoading && <ChartSkeleton />}

      {isError && (
        <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-4">
          Error al cargar los datos de stock.
        </div>
      )}

      {data && data.length === 0 && (
        <div className="text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          No hay productos con stock y costo registrados.
        </div>
      )}

      {data && data.length > 0 && <StockByCategoryChart data={data} />}
    </div>
  );
}

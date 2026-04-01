'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useStockByCategory } from '../../hooks/useStockByCategory';
import { useStockProducts } from '../../hooks/useStockProducts';
import { StockProductsTable } from './StockProductsTable';
import { InventoryRotationTable } from './InventoryRotationTable';

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: categoryData, isLoading: isCategoryLoading, isError: isCategoryError } = useStockByCategory();
  const { data: productData, isLoading: isProductLoading } = useStockProducts(selectedCategory);

  const handleCategoryClick = (category: string) => {
    setSelectedCategory((prev) => (prev === category ? null : category));
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Dashboard</h1>

      {isCategoryLoading && <ChartSkeleton />}

      {isCategoryError && (
        <div className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg p-4">
          Error al cargar los datos de stock.
        </div>
      )}

      {categoryData && categoryData.length === 0 && (
        <div className="text-sm text-gray-400 bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          No hay productos con stock y costo registrados.
        </div>
      )}

      {categoryData && categoryData.length > 0 && (
        <StockByCategoryChart
          data={categoryData}
          selectedCategory={selectedCategory}
          onCategoryClick={handleCategoryClick}
        />
      )}

      {selectedCategory && isProductLoading && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mt-4 animate-pulse">
          <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded mb-2" />
          ))}
        </div>
      )}

      {selectedCategory && productData && (
        <StockProductsTable
          category={selectedCategory}
          data={productData}
          onClose={() => setSelectedCategory(null)}
        />
      )}

      <InventoryRotationTable />
    </div>
  );
}

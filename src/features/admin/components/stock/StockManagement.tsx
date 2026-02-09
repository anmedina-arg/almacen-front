'use client';

import { useState, useMemo } from 'react';
import { useProductStock } from '../../hooks/useProductStock';
import { useLowStock } from '../../hooks/useLowStock';
import { LowStockBadge } from './LowStockBadge';
import { StockUpdateModal } from './StockUpdateModal';
import { StockHistoryModal } from './StockHistoryModal';
import type { ProductStockView, StockFilters } from '../../types/stock.types';

const CATEGORY_LABELS: Record<string, string> = {
  almacen: 'Almacen',
  bebidas: 'Bebidas',
  snaks: 'Snacks',
  lacteos: 'Lacteos',
  panaderia: 'Panaderia',
  congelados: 'Congelados',
  fiambres: 'Fiambres',
  pizzas: 'Pizzas',
  combos: 'Combos',
  otros: 'Otros',
};

/**
 * Componente principal de gestion de stock.
 * Muestra una tabla/listado de todos los productos con su stock,
 * filtros de busqueda, y modales para editar y ver historial.
 */
export function StockManagement() {
  const { data: stockData, isLoading, error } = useProductStock();
  const { data: lowStockData } = useLowStock();

  const [filters, setFilters] = useState<StockFilters>({
    search: '',
    stockFilter: 'all',
    categoryFilter: '',
  });

  const [editingProduct, setEditingProduct] = useState<ProductStockView | null>(null);
  const [historyProduct, setHistoryProduct] = useState<{ id: number; name: string } | null>(null);

  // Extraer categorias unicas de los datos
  const categories = useMemo(() => {
    if (!stockData) return [];
    const unique = [...new Set(stockData.map((p) => p.main_category))].sort();
    return unique;
  }, [stockData]);

  // Filtrar datos
  const filteredData = useMemo(() => {
    if (!stockData) return [];

    return stockData.filter((product) => {
      // Filtro de busqueda
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesName = product.product_name.toLowerCase().includes(searchLower);
        if (!matchesName) return false;
      }

      // Filtro de categoria
      if (filters.categoryFilter) {
        if (product.main_category !== filters.categoryFilter) return false;
      }

      // Filtro de stock
      switch (filters.stockFilter) {
        case 'with_stock':
          if (product.quantity === null || Number(product.quantity) <= 0) return false;
          break;
        case 'no_stock':
          if (product.quantity !== null && Number(product.quantity) > 0) return false;
          break;
        case 'low_stock':
          if (!product.is_low_stock) return false;
          break;
        default:
          break;
      }

      return true;
    });
  }, [stockData, filters]);

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

    if (errorMessage.includes('Forbidden') || errorMessage.includes('Admin access required')) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
        </div>
      );
    }

    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-red-800">Error al cargar stock: {errorMessage}</p>
      </div>
    );
  }

  const lowStockCount = lowStockData?.length || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Control de Stock</h2>
          <p className="text-sm text-gray-500">
            Gestion de inventario de productos
          </p>
        </div>
        {lowStockCount > 0 && (
          <button
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                stockFilter: prev.stockFilter === 'low_stock' ? 'all' : 'low_stock',
              }))
            }
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filters.stockFilter === 'low_stock'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
            }`}
          >
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-200 text-red-800 text-xs font-bold">
              {lowStockCount}
            </span>
            Alertas de stock bajo
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />

        <select
          value={filters.categoryFilter}
          onChange={(e) => setFilters((prev) => ({ ...prev, categoryFilter: e.target.value }))}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="">Todas las categorias</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat] || cat}
            </option>
          ))}
        </select>

        <select
          value={filters.stockFilter}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              stockFilter: e.target.value as StockFilters['stockFilter'],
            }))
          }
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="all">Todo el stock</option>
          <option value="with_stock">Con stock</option>
          <option value="no_stock">Sin stock</option>
          <option value="low_stock">Stock bajo</option>
        </select>
      </div>

      {/* Contador */}
      <p className="text-sm text-gray-600">
        Mostrando {filteredData.length} de {stockData?.length || 0} productos
      </p>

      {/* Tabla Desktop */}
      {filteredData.length > 0 ? (
        <>
          <div className="hidden md:block bg-white rounded-lg shadow-md border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Producto</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Categoria</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Precio</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Cantidad</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Min.</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">Estado</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Notas</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((product) => (
                  <tr
                    key={product.product_id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      product.is_low_stock ? 'bg-red-50/50' : ''
                    } ${!product.product_active ? 'opacity-60' : ''}`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {product.product_image ? (
                          <img
                            src={product.product_image}
                            alt={product.product_name}
                            className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-400 text-xs">N/A</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{product.product_name}</p>
                          {!product.product_active && (
                            <span className="text-xs text-red-500">Inactivo</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {CATEGORY_LABELS[product.main_category] || product.main_category}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-gray-700">
                      ${Number(product.product_price).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-gray-800">
                      {product.quantity !== null ? Number(product.quantity) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-gray-500">
                      {product.min_stock !== null ? Number(product.min_stock) : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <LowStockBadge
                        isLowStock={product.is_low_stock}
                        quantity={product.quantity}
                        minStock={product.min_stock}
                      />
                    </td>
                    <td className="py-3 px-4 text-gray-500 max-w-[150px] truncate" title={product.notes || ''}>
                      {product.notes || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                          title="Editar stock"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() =>
                            setHistoryProduct({
                              id: product.product_id,
                              name: product.product_name,
                            })
                          }
                          className="px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-xs font-medium"
                          title="Ver historial"
                        >
                          Historial
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards Mobile */}
          <div className="md:hidden space-y-3">
            {filteredData.map((product) => (
              <div
                key={product.product_id}
                className={`bg-white rounded-lg shadow-md border border-gray-200 p-4 space-y-3 ${
                  product.is_low_stock ? 'border-red-200 bg-red-50/30' : ''
                } ${!product.product_active ? 'opacity-60' : ''}`}
              >
                {/* Product info */}
                <div className="flex items-center gap-3">
                  {product.product_image ? (
                    <img
                      src={product.product_image}
                      alt={product.product_name}
                      className="w-12 h-12 rounded-md object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-400 text-xs">N/A</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{product.product_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">
                        {CATEGORY_LABELS[product.main_category] || product.main_category}
                      </span>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-xs font-medium text-green-600">
                        ${Number(product.product_price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <LowStockBadge
                    isLowStock={product.is_low_stock}
                    quantity={product.quantity}
                    minStock={product.min_stock}
                  />
                </div>

                {/* Stock info */}
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Stock:</span>{' '}
                    <span className="font-semibold text-gray-800">
                      {product.quantity !== null ? Number(product.quantity) : 'N/A'}
                    </span>
                  </div>
                  {product.min_stock !== null && (
                    <div>
                      <span className="text-gray-500">Min:</span>{' '}
                      <span className="font-semibold text-gray-600">{Number(product.min_stock)}</span>
                    </div>
                  )}
                </div>

                {product.notes && (
                  <p className="text-xs text-gray-500 truncate">{product.notes}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingProduct(product)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Editar Stock
                  </button>
                  <button
                    onClick={() =>
                      setHistoryProduct({
                        id: product.product_id,
                        name: product.product_name,
                      })
                    }
                    className="flex-1 px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm font-medium"
                  >
                    Historial
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No se encontraron productos con los filtros actuales.</p>
        </div>
      )}

      {/* Modales */}
      {editingProduct && (
        <StockUpdateModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {historyProduct && (
        <StockHistoryModal
          productId={historyProduct.id}
          productName={historyProduct.name}
          onClose={() => setHistoryProduct(null)}
        />
      )}
    </div>
  );
}

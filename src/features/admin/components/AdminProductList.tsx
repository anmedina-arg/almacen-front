'use client';

import { useState } from 'react';
import { useAdminProducts } from '../hooks/useAdminProducts';
import { AdminProductCard } from './AdminProductCard';
import { ProductFormModal } from './ProductFormModal';
import type { Product } from '@/types';

export function AdminProductList() {
  const { data: products, isLoading, error } = useAdminProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  if (error) {
    const errorMessage = (error as Error).message;

    // Si es error de autorización, el layout debería redirigir
    // Mostrar mensaje genérico mientras se procesa la redirección
    if (errorMessage.includes('Forbidden') || errorMessage.includes('Admin access required')) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
        </div>
      );
    }

    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-red-800">Error al cargar productos: {errorMessage}</p>
      </div>
    );
  }

  // Filtrar productos
  const filteredProducts = products?.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterActive === 'all' ||
      (filterActive === 'active' && product.active) ||
      (filterActive === 'inactive' && !product.active);

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-4">
      {/* Header con botón crear */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Productos</h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium"
        >
          + Crear Producto
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />

        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      {/* Contador */}
      <p className="text-sm text-gray-600">
        Mostrando {filteredProducts?.length || 0} de {products?.length || 0} productos
      </p>

      {/* Grid de productos */}
      {filteredProducts && filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <AdminProductCard
              key={product.id}
              product={product}
              onEdit={() => setEditingProduct(product)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No se encontraron productos</p>
        </div>
      )}

      {/* Modales */}
      {isCreateModalOpen && (
        <ProductFormModal
          mode="create"
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {editingProduct && (
        <ProductFormModal
          mode="edit"
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
        />
      )}
    </div>
  );
}

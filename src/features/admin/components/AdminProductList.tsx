'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAdminProducts } from '../hooks/useAdminProducts';
import { useToggleProductActive } from '../hooks/useToggleProductActive';
import { useDeleteProduct } from '../hooks/useDeleteProduct';
import { CATEGORY_LABELS } from '../constants';
import { ProductFormModal } from './ProductFormModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { Spinner } from '@/components/ui/Spinner';
import type { Product } from '@/types';

export function AdminProductList() {
  const { data: products, isLoading, error } = useAdminProducts();
  const toggleMutation = useToggleProductActive();
  const deleteMutation = useDeleteProduct();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('Forbidden') || errorMessage.includes('Admin access required')) {
      return (
        <div className="flex justify-center items-center py-12">
          <Spinner size="lg" />
        </div>
      );
    }
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-red-800">Error al cargar productos: {errorMessage}</p>
      </div>
    );
  }

  const filteredProducts = products?.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterActive === 'all' ||
      (filterActive === 'active' && product.active) ||
      (filterActive === 'inactive' && !product.active);
    return matchesSearch && matchesFilter;
  });

  const handleDelete = () => {
    if (!deletingProduct) return;
    deleteMutation.mutate(deletingProduct.id, {
      onSuccess: () => setDeletingProduct(null),
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Productos</h2>
          <p className="text-sm text-gray-500">Gestión del catálogo de productos</p>
        </div>
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

      {filteredProducts && filteredProducts.length > 0 ? (
        <>
          {/* Tabla Desktop */}
          <div className="hidden md:block bg-white rounded-lg shadow-md border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Producto</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Categoría</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Costo</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Precio</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">Activo</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${!product.active ? 'opacity-60' : ''}`}
                  >
                    {/* Producto */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-md object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-400 text-xs">N/A</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{product.name}</p>
                          {!product.active && (
                            <span className="text-xs text-red-500">Inactivo</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Categoría */}
                    <td className="py-3 px-4 text-gray-600">
                      {CATEGORY_LABELS[product.mainCategory ?? ''] ?? product.mainCategory ?? '-'}
                    </td>

                    {/* Costo */}
                    <td className="py-3 px-4 text-right font-mono text-gray-500">
                      {product.cost != null && Number(product.cost) > 0
                        ? `$${Number(product.cost).toFixed(2)}`
                        : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Precio */}
                    <td className="py-3 px-4 text-right font-mono font-semibold text-gray-700">
                      ${Number(product.price).toFixed(2)}
                    </td>

                    {/* Activo (checkbox) */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={product.active}
                        onChange={() => toggleMutation.mutate({ id: product.id, newActive: !product.active })}
                        disabled={toggleMutation.isPending}
                        className="w-4 h-4 accent-green-600 cursor-pointer disabled:cursor-not-allowed"
                        aria-label={`${product.active ? 'Desactivar' : 'Activar'} ${product.name}`}
                      />
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeletingProduct(product)}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs font-medium"
                        >
                          Eliminar
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
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className={`bg-white rounded-lg shadow-md border border-gray-200 p-4 space-y-3 ${!product.active ? 'opacity-60' : ''}`}
              >
                {/* Info del producto */}
                <div className="flex items-center gap-3">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-md object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-400 text-xs">N/A</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">
                        {CATEGORY_LABELS[product.mainCategory ?? ''] ?? product.mainCategory ?? '-'}
                      </span>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-xs font-medium text-green-600">
                        ${Number(product.price).toFixed(2)}
                      </span>
                      {product.cost != null && Number(product.cost) > 0 && (
                        <>
                          <span className="text-xs text-gray-400">|</span>
                          <span className="text-xs text-gray-500">
                            costo ${Number(product.cost).toFixed(2)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Checkbox activo */}
                  <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={product.active}
                      onChange={() => toggleMutation.mutate({ id: product.id, newActive: !product.active })}
                      disabled={toggleMutation.isPending}
                      className="w-4 h-4 accent-green-600 cursor-pointer disabled:cursor-not-allowed"
                      aria-label={`${product.active ? 'Desactivar' : 'Activar'} ${product.name}`}
                    />
                    <span className="text-xs text-gray-500">
                      {product.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </label>
                </div>

                {/* Acciones */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingProduct(product)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setDeletingProduct(product)}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
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

      {deletingProduct && (
        <DeleteConfirmationModal
          productName={deletingProduct.name}
          onConfirm={handleDelete}
          onCancel={() => setDeletingProduct(null)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { useDeleteCategory } from '../../hooks/useDeleteCategory';
import { CategoryFormModal } from './CategoryFormModal';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import type { CategoryWithSubcategories } from '../../types/category.types';

export function CategoryManagement() {
  const { data: categories, isLoading, error } = useCategories();
  const deleteMutation = useDeleteCategory();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithSubcategories | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryWithSubcategories | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
      </div>
    );
  }

  if (error) {
    const msg = (error as Error).message;
    if (msg.includes('Forbidden') || msg.includes('Admin access required')) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
        </div>
      );
    }
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-red-800">Error al cargar categorías: {msg}</p>
      </div>
    );
  }

  const filtered = (categories ?? []).filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = () => {
    if (!deletingCategory) return;
    deleteMutation.mutate(deletingCategory.id, {
      onSuccess: () => setDeletingCategory(null),
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Categorías</h2>
          <p className="text-sm text-gray-500">Gestión de categorías y subcategorías</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium"
        >
          + Nueva Categoría
        </button>
      </div>

      {/* Buscador */}
      <input
        type="text"
        placeholder="Buscar por nombre..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full sm:max-w-sm px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
      />

      {/* Contador */}
      <p className="text-sm text-gray-600">
        Mostrando {filtered.length} de {categories?.length ?? 0} categorías
      </p>

      {filtered.length > 0 ? (
        <>
          {/* Tabla Desktop */}
          <div className="hidden md:block bg-white rounded-lg shadow-md border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Categoría</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Subcategorías</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((category) => (
                  <tr key={category.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-800">{category.name}</td>
                    <td className="py-3 px-4 text-gray-500">
                      {category.subcategories.length === 0 ? (
                        <span className="text-gray-400 text-xs">Sin subcategorías</span>
                      ) : (
                        <span>
                          {category.subcategories.map((s) => s.name).join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setEditingCategory(category)}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeletingCategory(category)}
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
            {filtered.map((category) => (
              <div
                key={category.id}
                className="bg-white rounded-lg shadow-md border border-gray-200 p-4 space-y-3"
              >
                <div>
                  <p className="font-semibold text-gray-800">{category.name}</p>
                  {category.subcategories.length === 0 ? (
                    <p className="text-xs text-gray-400 mt-0.5">Sin subcategorías</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {category.subcategories.map((s) => s.name).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingCategory(category)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setDeletingCategory(category)}
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
          <p className="text-gray-500">
            {searchTerm ? 'No se encontraron categorías' : 'Todavía no hay categorías. Crea la primera.'}
          </p>
        </div>
      )}

      {/* Modales */}
      {isCreateModalOpen && (
        <CategoryFormModal
          mode="create"
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {editingCategory && (
        <CategoryFormModal
          mode="edit"
          category={editingCategory}
          onClose={() => setEditingCategory(null)}
        />
      )}

      {deletingCategory && (
        <DeleteConfirmationModal
          productName={deletingCategory.name}
          onConfirm={handleDelete}
          onCancel={() => setDeletingCategory(null)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}

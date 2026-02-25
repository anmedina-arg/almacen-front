'use client';

import { useState } from 'react';
import { useCreateCategory } from '../../hooks/useCreateCategory';
import { useUpdateCategory } from '../../hooks/useUpdateCategory';
import { useCreateSubcategory } from '../../hooks/useCreateSubcategory';
import { useUpdateSubcategory } from '../../hooks/useUpdateSubcategory';
import { useDeleteSubcategory } from '../../hooks/useDeleteSubcategory';
import type { CategoryWithSubcategories, Subcategory } from '../../types/category.types';

interface CategoryFormModalProps {
  mode: 'create' | 'edit';
  category?: CategoryWithSubcategories;
  onClose: () => void;
}

export function CategoryFormModal({ mode, category, onClose }: CategoryFormModalProps) {
  const [name, setName] = useState(category?.name ?? '');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [editingSubcategory, setEditingSubcategory] = useState<{ id: number; name: string } | null>(null);
  const [deletingSubcategoryId, setDeletingSubcategoryId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const createSubcategory = useCreateSubcategory();
  const updateSubcategory = useUpdateSubcategory();
  const deleteSubcategory = useDeleteSubcategory();

  const isSaving = createCategory.isPending || updateCategory.isPending;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('El nombre es requerido');
      return;
    }
    setError('');

    if (mode === 'create') {
      createCategory.mutate(
        { name: trimmed },
        { onSuccess: onClose, onError: (e) => setError(e.message) }
      );
    } else if (category) {
      updateCategory.mutate(
        { id: category.id, data: { name: trimmed } },
        { onSuccess: onClose, onError: (e) => setError(e.message) }
      );
    }
  };

  const handleAddSubcategory = () => {
    const trimmed = newSubcategoryName.trim();
    if (!trimmed || !category) return;

    createSubcategory.mutate(
      { categoryId: category.id, name: trimmed },
      {
        onSuccess: () => setNewSubcategoryName(''),
        onError: (e) => setError(e.message),
      }
    );
  };

  const handleSaveSubcategoryEdit = () => {
    if (!editingSubcategory || !category) return;
    const trimmed = editingSubcategory.name.trim();
    if (!trimmed) return;

    updateSubcategory.mutate(
      { id: editingSubcategory.id, categoryId: category.id, name: trimmed },
      {
        onSuccess: () => setEditingSubcategory(null),
        onError: (e) => setError(e.message),
      }
    );
  };

  const handleDeleteSubcategory = (sub: Subcategory) => {
    if (!category) return;
    deleteSubcategory.mutate(
      { id: sub.id, categoryId: category.id },
      {
        onSuccess: () => setDeletingSubcategoryId(null),
        onError: (e) => setError(e.message),
      }
    );
  };

  const subcategories = category?.subcategories ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-800">
            {mode === 'create' ? 'Nueva Categoría' : 'Editar Categoría'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Nombre categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de categoría
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="Ej: Lácteos"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>

          {/* Subcategorías — solo en modo edit */}
          {mode === 'edit' && category && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Subcategorías</p>

              {subcategories.length === 0 && (
                <p className="text-xs text-gray-400 mb-3">Sin subcategorías todavía.</p>
              )}

              <ul className="space-y-2 mb-3">
                {subcategories.map((sub) => (
                  <li key={sub.id} className="flex items-center gap-2">
                    {editingSubcategory?.id === sub.id ? (
                      <>
                        <input
                          type="text"
                          value={editingSubcategory.name}
                          onChange={(e) =>
                            setEditingSubcategory({ id: sub.id, name: e.target.value })
                          }
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveSubcategoryEdit()}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveSubcategoryEdit}
                          disabled={updateSubcategory.isPending}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                        >
                          {updateSubcategory.isPending ? '...' : 'Guardar'}
                        </button>
                        <button
                          onClick={() => setEditingSubcategory(null)}
                          className="px-2 py-1 border border-gray-300 text-gray-600 rounded text-xs hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : deletingSubcategoryId === sub.id ? (
                      <>
                        <span className="flex-1 text-sm text-gray-700 truncate">{sub.name}</span>
                        <span className="text-xs text-red-600">¿Eliminar?</span>
                        <button
                          onClick={() => handleDeleteSubcategory(sub)}
                          disabled={deleteSubcategory.isPending}
                          className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                        >
                          {deleteSubcategory.isPending ? '...' : 'Sí'}
                        </button>
                        <button
                          onClick={() => setDeletingSubcategoryId(null)}
                          className="px-2 py-1 border border-gray-300 text-gray-600 rounded text-xs hover:bg-gray-50"
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-700 truncate">{sub.name}</span>
                        <button
                          onClick={() => setEditingSubcategory({ id: sub.id, name: sub.name })}
                          className="px-2 py-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setDeletingSubcategoryId(sub.id)}
                          className="px-2 py-1 text-red-500 hover:text-red-700 text-xs font-medium"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>

              {/* Agregar subcategoría */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubcategoryName}
                  onChange={(e) => setNewSubcategoryName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubcategory()}
                  placeholder="Nueva subcategoría..."
                  className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={handleAddSubcategory}
                  disabled={!newSubcategoryName.trim() || createSubcategory.isPending}
                  className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 whitespace-nowrap"
                >
                  {createSubcategory.isPending ? '...' : '+ Agregar'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium disabled:opacity-50 text-sm"
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

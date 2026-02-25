'use client';

import { useState } from 'react';
import { useCreateCategory } from '../../hooks/useCreateCategory';
import { useUpdateCategory } from '../../hooks/useUpdateCategory';
import type { CategoryWithSubcategories } from '../../types/category.types';

type CategoryFormModalProps =
  | { mode: 'create'; category?: never; onClose: () => void }
  | { mode: 'edit'; category: CategoryWithSubcategories; onClose: () => void };

export function CategoryFormModal({ mode, category, onClose }: CategoryFormModalProps) {
  const [name, setName] = useState(category?.name ?? '');
  const [error, setError] = useState('');

  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const isSaving = createCategory.isPending || updateCategory.isPending;

  const handleSave = () => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
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
        <div className="p-6">
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
            autoFocus
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
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

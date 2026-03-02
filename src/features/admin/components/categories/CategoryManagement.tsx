'use client';

import { useState, Fragment } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { useDeleteCategory } from '../../hooks/useDeleteCategory';
import { useCreateSubcategory } from '../../hooks/useCreateSubcategory';
import { useUpdateSubcategory } from '../../hooks/useUpdateSubcategory';
import { useDeleteSubcategory } from '../../hooks/useDeleteSubcategory';
import { CategoryFormModal } from './CategoryFormModal';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import { Spinner } from '@/components/ui/Spinner';
import type { CategoryWithSubcategories } from '../../types/category.types';

const INPUT_CLS =
  'px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-full max-w-xs';

export function CategoryManagement() {
  const { data: categories, isLoading, error } = useCategories();
  const deleteCategoryMutation = useDeleteCategory();
  const createSubMutation = useCreateSubcategory();
  const updateSubMutation = useUpdateSubcategory();
  const deleteSubMutation = useDeleteSubcategory();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithSubcategories | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CategoryWithSubcategories | null>(null);

  // Inline subcategory state
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [editingSubName, setEditingSubName] = useState('');
  const [deletingSubInfo, setDeletingSubInfo] = useState<{ id: number; categoryId: number } | null>(null);
  const [addingSubForCatId, setAddingSubForCatId] = useState<number | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [subError, setSubError] = useState('');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    if (msg.includes('Forbidden') || msg.includes('Admin access required')) {
      return (
        <div className="rounded-md bg-yellow-50 p-4">
          <p className="text-yellow-800">Acceso no autorizado. Por favor iniciá sesión como administrador.</p>
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

  // --- Handlers ---

  const handleDeleteCategory = () => {
    if (!deletingCategory) return;
    deleteCategoryMutation.mutate(deletingCategory.id, {
      onSuccess: () => setDeletingCategory(null),
    });
  };

  const handleStartEditSub = (subId: number, currentName: string) => {
    setEditingSubId(subId);
    setEditingSubName(currentName);
    setDeletingSubInfo(null);
  };

  const handleSaveSubEdit = (categoryId: number) => {
    if (!editingSubId || !editingSubName.trim()) return;
    setSubError('');
    updateSubMutation.mutate(
      { id: editingSubId, categoryId, name: editingSubName.trim() },
      {
        onSuccess: () => {
          setEditingSubId(null);
          setEditingSubName('');
        },
        onError: (e) => setSubError(e.message),
      }
    );
  };

  const handleConfirmDeleteSub = () => {
    if (!deletingSubInfo) return;
    setSubError('');
    deleteSubMutation.mutate(deletingSubInfo, {
      onSuccess: () => setDeletingSubInfo(null),
      onError: (e) => setSubError(e.message),
    });
  };

  const handleAddSub = (categoryId: number) => {
    if (!newSubName.trim()) return;
    setSubError('');
    createSubMutation.mutate(
      { categoryId, name: newSubName.trim() },
      {
        onSuccess: () => {
          setNewSubName('');
          setAddingSubForCatId(null);
        },
        onError: (e) => setSubError(e.message),
      }
    );
  };

  // --- Render ---
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

      {/* Error de subcategoría */}
      {subError && (
        <div className="rounded-md bg-red-50 px-4 py-2 flex items-center justify-between">
          <p className="text-sm text-red-700">{subError}</p>
          <button onClick={() => setSubError('')} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
        </div>
      )}

      {/* Contador */}
      <p className="text-sm text-gray-600">
        Mostrando {filtered.length} de {categories?.length ?? 0} categorías
      </p>

      {filtered.length > 0 ? (
        <>
          {/* ── Tabla Desktop ── */}
          <div className="hidden md:block bg-white rounded-lg shadow-md border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Categoría / Subcategoría</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600 w-52">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((category) => (
                  <Fragment key={category.id}>
                    {/* Fila de categoría */}
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-800">{category.name}</span>
                        <span className="ml-2 text-xs text-gray-400 font-normal">
                          ({category.subcategories.length} subcategorías)
                        </span>
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

                    {/* Filas de subcategorías */}
                    {category.subcategories.map((sub) => (
                      <tr key={`sub-${sub.id}`} className="border-b border-gray-100 bg-white hover:bg-gray-50">
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2 pl-6">
                            <span className="text-gray-300 select-none text-base leading-none">└─</span>
                            {editingSubId === sub.id ? (
                              <input
                                value={editingSubName}
                                onChange={(e) => setEditingSubName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveSubEdit(category.id);
                                  if (e.key === 'Escape') { setEditingSubId(null); setEditingSubName(''); }
                                }}
                                className={INPUT_CLS}
                                autoFocus
                              />
                            ) : deletingSubInfo?.id === sub.id ? (
                              <span className="text-sm text-red-600">¿Eliminar &ldquo;{sub.name}&rdquo;?</span>
                            ) : (
                              <span className="text-sm text-gray-600">{sub.name}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {editingSubId === sub.id ? (
                              <>
                                <button
                                  onClick={() => handleSaveSubEdit(category.id)}
                                  disabled={updateSubMutation.isPending}
                                  className="px-2.5 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                                >
                                  {updateSubMutation.isPending ? '...' : 'Guardar'}
                                </button>
                                <button
                                  onClick={() => { setEditingSubId(null); setEditingSubName(''); }}
                                  className="px-2.5 py-1 border border-gray-300 text-gray-600 rounded text-xs hover:bg-gray-50"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : deletingSubInfo?.id === sub.id ? (
                              <>
                                <button
                                  onClick={handleConfirmDeleteSub}
                                  disabled={deleteSubMutation.isPending}
                                  className="px-2.5 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                                >
                                  {deleteSubMutation.isPending ? '...' : 'Sí'}
                                </button>
                                <button
                                  onClick={() => setDeletingSubInfo(null)}
                                  className="px-2.5 py-1 border border-gray-300 text-gray-600 rounded text-xs hover:bg-gray-50"
                                >
                                  No
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEditSub(sub.id, sub.name)}
                                  className="px-2.5 py-1 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-50 transition-colors"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => setDeletingSubInfo({ id: sub.id, categoryId: category.id })}
                                  className="px-2.5 py-1 text-red-500 border border-red-200 rounded text-xs hover:bg-red-50 transition-colors"
                                >
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* Fila agregar subcategoría */}
                    <tr key={`add-${category.id}`} className="border-b border-gray-100 bg-white">
                      {addingSubForCatId === category.id ? (
                        <>
                          <td className="py-2 px-4">
                            <div className="flex items-center gap-2 pl-6">
                              <span className="text-gray-300 select-none text-base leading-none">└─</span>
                              <input
                                value={newSubName}
                                onChange={(e) => setNewSubName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddSub(category.id);
                                  if (e.key === 'Escape') { setAddingSubForCatId(null); setNewSubName(''); }
                                }}
                                placeholder="Nombre de subcategoría..."
                                className={INPUT_CLS}
                                autoFocus
                              />
                            </div>
                          </td>
                          <td className="py-2 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleAddSub(category.id)}
                                disabled={!newSubName.trim() || createSubMutation.isPending}
                                className="px-2.5 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                              >
                                {createSubMutation.isPending ? '...' : 'Agregar'}
                              </button>
                              <button
                                onClick={() => { setAddingSubForCatId(null); setNewSubName(''); }}
                                className="px-2.5 py-1 border border-gray-300 text-gray-600 rounded text-xs hover:bg-gray-50"
                              >
                                Cancelar
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <td colSpan={2} className="py-1.5 px-4">
                          <div className="pl-6">
                            <button
                              onClick={() => { setAddingSubForCatId(category.id); setNewSubName(''); }}
                              className="text-xs text-green-600 hover:text-green-800 font-medium"
                            >
                              + Agregar subcategoría
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Cards Mobile ── */}
          <div className="md:hidden space-y-3">
            {filtered.map((category) => (
              <div
                key={category.id}
                className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden"
              >
                {/* Cabecera de categoría */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div>
                    <p className="font-semibold text-gray-800">{category.name}</p>
                    <p className="text-xs text-gray-400">{category.subcategories.length} subcategorías</p>
                  </div>
                  <div className="flex gap-2">
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
                </div>

                {/* Lista de subcategorías */}
                <div className="divide-y divide-gray-100">
                  {category.subcategories.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2 px-4 py-2">
                      <span className="text-gray-300 select-none text-base leading-none pl-2">└─</span>
                      <div className="flex-1 min-w-0">
                        {editingSubId === sub.id ? (
                          <input
                            value={editingSubName}
                            onChange={(e) => setEditingSubName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveSubEdit(category.id);
                              if (e.key === 'Escape') { setEditingSubId(null); setEditingSubName(''); }
                            }}
                            className={INPUT_CLS}
                            autoFocus
                          />
                        ) : deletingSubInfo?.id === sub.id ? (
                          <span className="text-sm text-red-600">¿Eliminar &ldquo;{sub.name}&rdquo;?</span>
                        ) : (
                          <span className="text-sm text-gray-600 truncate">{sub.name}</span>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {editingSubId === sub.id ? (
                          <>
                            <button
                              onClick={() => handleSaveSubEdit(category.id)}
                              disabled={updateSubMutation.isPending}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs disabled:opacity-50"
                            >
                              {updateSubMutation.isPending ? '...' : 'Guardar'}
                            </button>
                            <button
                              onClick={() => { setEditingSubId(null); setEditingSubName(''); }}
                              className="px-2 py-1 border border-gray-300 text-gray-600 rounded text-xs"
                            >
                              ✕
                            </button>
                          </>
                        ) : deletingSubInfo?.id === sub.id ? (
                          <>
                            <button
                              onClick={handleConfirmDeleteSub}
                              disabled={deleteSubMutation.isPending}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs disabled:opacity-50"
                            >
                              {deleteSubMutation.isPending ? '...' : 'Sí'}
                            </button>
                            <button
                              onClick={() => setDeletingSubInfo(null)}
                              className="px-2 py-1 border border-gray-300 text-gray-600 rounded text-xs"
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEditSub(sub.id, sub.name)}
                              className="px-2 py-1 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-50"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setDeletingSubInfo({ id: sub.id, categoryId: category.id })}
                              className="px-2 py-1 text-red-500 border border-red-200 rounded text-xs hover:bg-red-50"
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Agregar subcategoría mobile */}
                  {addingSubForCatId === category.id ? (
                    <div className="flex items-center gap-2 px-4 py-2">
                      <span className="text-gray-300 select-none text-base leading-none pl-2">└─</span>
                      <input
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddSub(category.id);
                          if (e.key === 'Escape') { setAddingSubForCatId(null); setNewSubName(''); }
                        }}
                        placeholder="Nombre de subcategoría..."
                        className={`${INPUT_CLS} flex-1`}
                        autoFocus
                      />
                      <button
                        onClick={() => handleAddSub(category.id)}
                        disabled={!newSubName.trim() || createSubMutation.isPending}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs disabled:opacity-50"
                      >
                        {createSubMutation.isPending ? '...' : 'Agregar'}
                      </button>
                      <button
                        onClick={() => { setAddingSubForCatId(null); setNewSubName(''); }}
                        className="px-2 py-1 border border-gray-300 text-gray-600 rounded text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="px-4 py-2 pl-10">
                      <button
                        onClick={() => { setAddingSubForCatId(category.id); setNewSubName(''); }}
                        className="text-xs text-green-600 hover:text-green-800 font-medium"
                      >
                        + Agregar subcategoría
                      </button>
                    </div>
                  )}
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
          onConfirm={handleDeleteCategory}
          onCancel={() => setDeletingCategory(null)}
          isDeleting={deleteCategoryMutation.isPending}
        />
      )}
    </div>
  );
}

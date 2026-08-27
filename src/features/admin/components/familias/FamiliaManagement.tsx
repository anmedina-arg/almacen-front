'use client';

import { useState, Fragment } from 'react';
import { useFamilias } from '../../hooks/useFamilias';
import { useDeleteFamilia } from '../../hooks/useDeleteFamilia';
import { useCreateVariedad } from '../../hooks/useCreateVariedad';
import { useUpdateVariedad } from '../../hooks/useUpdateVariedad';
import { FamiliaFormModal } from './FamiliaFormModal';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import { Spinner } from '@/components/ui/Spinner';
import type { FamiliaWithVariedades } from '../../types/familia.types';

const INPUT_CLS =
  'px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-full max-w-xs';

// Sección "Familias", tercera del panel de Categorías/Subcategorías (#93,
// spec #91) — mismo patrón de interacción que CategoryManagement, con dos
// diferencias forzadas por el schema de #92: sin sort_order (no hay
// botones ↑/↓, se ordena por nombre) y las Variedades se deshabilitan
// (active=false), no se borran — el AC pide "alta/edición/deshabilitación",
// nunca "baja" para Variedades.
export function FamiliaManagement() {
  const { data: familias, isLoading, error } = useFamilias();
  const deleteFamiliaMutation = useDeleteFamilia();
  const createVarMutation = useCreateVariedad();
  const updateVarMutation = useUpdateVariedad();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingFamilia, setEditingFamilia] = useState<FamiliaWithVariedades | null>(null);
  const [deletingFamilia, setDeletingFamilia] = useState<FamiliaWithVariedades | null>(null);

  // Inline variedad state
  const [editingVarId, setEditingVarId] = useState<number | null>(null);
  const [editingVarName, setEditingVarName] = useState('');
  const [addingVarForFamId, setAddingVarForFamId] = useState<number | null>(null);
  const [newVarName, setNewVarName] = useState('');
  const [varError, setVarError] = useState('');

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
        <p className="text-red-800">Error al cargar familias: {msg}</p>
      </div>
    );
  }

  const sorted = [...(familias ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const filtered = sorted.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // --- Handlers ---

  const handleDeleteFamilia = () => {
    if (!deletingFamilia) return;
    deleteFamiliaMutation.mutate(deletingFamilia.id, {
      onSuccess: () => setDeletingFamilia(null),
    });
  };

  const handleStartEditVar = (varId: number, currentName: string) => {
    setEditingVarId(varId);
    setEditingVarName(currentName);
  };

  const handleSaveVarEdit = () => {
    if (!editingVarId || !editingVarName.trim()) return;
    setVarError('');
    updateVarMutation.mutate(
      { id: editingVarId, data: { name: editingVarName.trim() } },
      {
        onSuccess: () => {
          setEditingVarId(null);
          setEditingVarName('');
        },
        onError: (e) => setVarError(e.message),
      }
    );
  };

  const handleToggleVarActive = (varId: number, currentlyActive: boolean) => {
    setVarError('');
    updateVarMutation.mutate(
      { id: varId, data: { active: !currentlyActive } },
      { onError: (e) => setVarError(e.message) }
    );
  };

  const handleAddVar = (familiaId: number) => {
    if (!newVarName.trim()) return;
    setVarError('');
    createVarMutation.mutate(
      { familiaId, name: newVarName.trim() },
      {
        onSuccess: () => {
          setNewVarName('');
          setAddingVarForFamId(null);
        },
        onError: (e) => setVarError(e.message),
      }
    );
  };

  // --- Render ---
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Familias</h2>
          <p className="text-sm text-gray-500">
            Gestión de Familias y Variedades — base de los Productos Surtidos
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium"
        >
          + Nueva Familia
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

      {/* Error de variedad */}
      {varError && (
        <div className="rounded-md bg-red-50 px-4 py-2 flex items-center justify-between">
          <p className="text-sm text-red-700">{varError}</p>
          <button onClick={() => setVarError('')} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
        </div>
      )}

      {/* Contador */}
      <p className="text-sm text-gray-600">
        Mostrando {filtered.length} de {familias?.length ?? 0} familias
      </p>

      {filtered.length > 0 ? (
        <>
          {/* ── Tabla Desktop ── */}
          <div className="hidden md:block bg-white rounded-lg shadow-md border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Familia / Variedad</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-600 w-52">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((familia) => (
                  <Fragment key={familia.id}>
                    {/* Fila de familia */}
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-gray-800">{familia.name}</span>
                        <span className="ml-2 text-xs text-gray-400 font-normal">
                          ({familia.variedades.length} variedades)
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setEditingFamilia(familia)}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => setDeletingFamilia(familia)}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs font-medium"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Filas de variedades */}
                    {[...familia.variedades]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((variedad) => (
                      <tr key={`var-${variedad.id}`} className="border-b border-gray-100 bg-white hover:bg-gray-50">
                        <td className="py-2 px-4">
                          <div className="flex items-center gap-2 pl-6">
                            <span className="text-gray-300 select-none text-base leading-none">└─</span>
                            {editingVarId === variedad.id ? (
                              <input
                                value={editingVarName}
                                onChange={(e) => setEditingVarName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveVarEdit();
                                  if (e.key === 'Escape') { setEditingVarId(null); setEditingVarName(''); }
                                }}
                                className={INPUT_CLS}
                                autoFocus
                              />
                            ) : (
                              <span className={`text-sm ${variedad.active ? 'text-gray-600' : 'text-gray-400 line-through'}`}>
                                {variedad.name}
                                {!variedad.active && <span className="ml-2 text-xs text-gray-400 no-underline">(inactiva)</span>}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {editingVarId === variedad.id ? (
                              <>
                                <button
                                  onClick={handleSaveVarEdit}
                                  disabled={updateVarMutation.isPending}
                                  className="px-2.5 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                                >
                                  {updateVarMutation.isPending ? '...' : 'Guardar'}
                                </button>
                                <button
                                  onClick={() => { setEditingVarId(null); setEditingVarName(''); }}
                                  className="px-2.5 py-1 border border-gray-300 text-gray-600 rounded text-xs hover:bg-gray-50"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEditVar(variedad.id, variedad.name)}
                                  className="px-2.5 py-1 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-50 transition-colors"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleToggleVarActive(variedad.id, variedad.active)}
                                  disabled={updateVarMutation.isPending}
                                  className={`px-2.5 py-1 rounded text-xs transition-colors disabled:opacity-50 ${
                                    variedad.active
                                      ? 'text-amber-600 border border-amber-200 hover:bg-amber-50'
                                      : 'text-green-600 border border-green-200 hover:bg-green-50'
                                  }`}
                                >
                                  {variedad.active ? 'Desactivar' : 'Activar'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* Fila agregar variedad */}
                    <tr key={`add-${familia.id}`} className="border-b border-gray-100 bg-white">
                      {addingVarForFamId === familia.id ? (
                        <>
                          <td className="py-2 px-4">
                            <div className="flex items-center gap-2 pl-6">
                              <span className="text-gray-300 select-none text-base leading-none">└─</span>
                              <input
                                value={newVarName}
                                onChange={(e) => setNewVarName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddVar(familia.id);
                                  if (e.key === 'Escape') { setAddingVarForFamId(null); setNewVarName(''); }
                                }}
                                placeholder="Nombre de variedad..."
                                className={INPUT_CLS}
                                autoFocus
                              />
                            </div>
                          </td>
                          <td className="py-2 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleAddVar(familia.id)}
                                disabled={!newVarName.trim() || createVarMutation.isPending}
                                className="px-2.5 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
                              >
                                {createVarMutation.isPending ? '...' : 'Agregar'}
                              </button>
                              <button
                                onClick={() => { setAddingVarForFamId(null); setNewVarName(''); }}
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
                              onClick={() => { setAddingVarForFamId(familia.id); setNewVarName(''); }}
                              className="text-xs text-green-600 hover:text-green-800 font-medium"
                            >
                              + Agregar variedad
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
            {filtered.map((familia) => (
              <div
                key={familia.id}
                className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden"
              >
                {/* Cabecera de familia */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div>
                    <p className="font-semibold text-gray-800">{familia.name}</p>
                    <p className="text-xs text-gray-400">{familia.variedades.length} variedades</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingFamilia(familia)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setDeletingFamilia(familia)}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs font-medium"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {/* Lista de variedades */}
                <div className="divide-y divide-gray-100">
                  {[...familia.variedades]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((variedad) => (
                    <div key={variedad.id} className="flex items-center gap-2 px-4 py-2">
                      <span className="text-gray-300 select-none text-base leading-none pl-2">└─</span>
                      <div className="flex-1 min-w-0">
                        {editingVarId === variedad.id ? (
                          <input
                            value={editingVarName}
                            onChange={(e) => setEditingVarName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveVarEdit();
                              if (e.key === 'Escape') { setEditingVarId(null); setEditingVarName(''); }
                            }}
                            className={INPUT_CLS}
                            autoFocus
                          />
                        ) : (
                          <span className={`text-sm truncate ${variedad.active ? 'text-gray-600' : 'text-gray-400 line-through'}`}>
                            {variedad.name}
                            {!variedad.active && <span className="ml-2 text-xs text-gray-400 no-underline">(inactiva)</span>}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {editingVarId === variedad.id ? (
                          <>
                            <button
                              onClick={handleSaveVarEdit}
                              disabled={updateVarMutation.isPending}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs disabled:opacity-50"
                            >
                              {updateVarMutation.isPending ? '...' : 'Guardar'}
                            </button>
                            <button
                              onClick={() => { setEditingVarId(null); setEditingVarName(''); }}
                              className="px-2 py-1 border border-gray-300 text-gray-600 rounded text-xs"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEditVar(variedad.id, variedad.name)}
                              className="px-2 py-1 text-blue-600 border border-blue-200 rounded text-xs hover:bg-blue-50"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleToggleVarActive(variedad.id, variedad.active)}
                              disabled={updateVarMutation.isPending}
                              className={`px-2 py-1 rounded text-xs disabled:opacity-50 ${
                                variedad.active
                                  ? 'text-amber-600 border border-amber-200 hover:bg-amber-50'
                                  : 'text-green-600 border border-green-200 hover:bg-green-50'
                              }`}
                            >
                              {variedad.active ? 'Desact.' : 'Activar'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Agregar variedad mobile */}
                  {addingVarForFamId === familia.id ? (
                    <div className="flex items-center gap-2 px-4 py-2">
                      <span className="text-gray-300 select-none text-base leading-none pl-2">└─</span>
                      <input
                        value={newVarName}
                        onChange={(e) => setNewVarName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddVar(familia.id);
                          if (e.key === 'Escape') { setAddingVarForFamId(null); setNewVarName(''); }
                        }}
                        placeholder="Nombre de variedad..."
                        className={`${INPUT_CLS} flex-1`}
                        autoFocus
                      />
                      <button
                        onClick={() => handleAddVar(familia.id)}
                        disabled={!newVarName.trim() || createVarMutation.isPending}
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs disabled:opacity-50"
                      >
                        {createVarMutation.isPending ? '...' : 'Agregar'}
                      </button>
                      <button
                        onClick={() => { setAddingVarForFamId(null); setNewVarName(''); }}
                        className="px-2 py-1 border border-gray-300 text-gray-600 rounded text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="px-4 py-2 pl-10">
                      <button
                        onClick={() => { setAddingVarForFamId(familia.id); setNewVarName(''); }}
                        className="text-xs text-green-600 hover:text-green-800 font-medium"
                      >
                        + Agregar variedad
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
            {searchTerm ? 'No se encontraron familias' : 'Todavía no hay familias. Crea la primera.'}
          </p>
        </div>
      )}

      {/* Modales */}
      {isCreateModalOpen && (
        <FamiliaFormModal
          mode="create"
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {editingFamilia && (
        <FamiliaFormModal
          mode="edit"
          familia={editingFamilia}
          onClose={() => setEditingFamilia(null)}
        />
      )}

      {deletingFamilia && (
        <DeleteConfirmationModal
          productName={deletingFamilia.name}
          onConfirm={handleDeleteFamilia}
          onCancel={() => setDeletingFamilia(null)}
          isDeleting={deleteFamiliaMutation.isPending}
        />
      )}
    </div>
  );
}

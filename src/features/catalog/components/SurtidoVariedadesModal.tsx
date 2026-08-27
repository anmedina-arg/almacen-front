'use client';

import { useEffect, useState } from 'react';
import type { Product, VariedadSelection } from '../types';
import { useFamiliaVariedades } from '../hooks/useFamiliaVariedades';
import { useCartStore, usePendingSurtidoCount, useSurtidoLines } from '../stores/cartStore';

interface SurtidoVariedadesModalProps {
  isOpen: boolean;
  product: Product;
  onClose: () => void;
}

// Modal "Elegir sabores" (#94, ADR-0010) — único punto donde las unidades
// pendientes de un Producto Surtido se confirman como líneas reales del
// carrito. Cada unidad es una fila independiente con checkboxes (ninguna
// Variedad preseleccionada); reabrir sobre un producto con líneas ya
// confirmadas precarga esas combinaciones para revisar o cambiar.
export function SurtidoVariedadesModal({ isOpen, product, onClose }: SurtidoVariedadesModalProps) {
  const { variedades, isLoading } = useFamiliaVariedades(product.familia_id);
  const existingLines = useSurtidoLines(product.id);
  const pendingCount = usePendingSurtidoCount(product.id);
  const confirmSurtidoUnits = useCartStore((s) => s.confirmSurtidoUnits);

  const [units, setUnits] = useState<VariedadSelection[][]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Semilla del draft al abrir: líneas ya confirmadas (editables) + una
  // fila en blanco por cada unidad pendiente sin configurar todavía.
  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    setUnits([
      ...existingLines.map((line) => line.variedades ?? []),
      ...Array.from({ length: pendingCount }, () => [] as VariedadSelection[]),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- semilla solo al abrir, no en cada cambio de líneas/pendientes
  }, [isOpen]);

  if (!isOpen) return null;

  const min = product.min_variedades ?? 1;
  const max = product.max_variedades ?? Infinity;

  const isUnitValid = (unit: VariedadSelection[]) => unit.length >= min && unit.length <= max;
  const allUnitsValid = units.every(isUnitValid);

  const toggleVariedad = (unitIndex: number, variedad: VariedadSelection) => {
    setUnits((prev) =>
      prev.map((unit, i) => {
        if (i !== unitIndex) return unit;
        const isSelected = unit.some((v) => v.id === variedad.id);
        return isSelected
          ? unit.filter((v) => v.id !== variedad.id)
          : [...unit, variedad];
      })
    );
  };

  const removeUnit = (unitIndex: number) => {
    setUnits((prev) => prev.filter((_, i) => i !== unitIndex));
  };

  const handleConfirm = () => {
    const result = confirmSurtidoUnits(product, units);
    if (!result.success) {
      setFormError(result.error ?? 'No se pudo confirmar la selección');
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="overflow-y-auto flex-1 p-6 pb-2">
          <h3 className="text-xl font-bold mb-1 text-gray-800">Elegir sabores</h3>
          <p className="text-sm text-gray-500 mb-4">{product.name}</p>

          {isLoading && <p className="text-sm text-gray-500">Cargando Variedades...</p>}

          {!isLoading && variedades.length === 0 && (
            <p className="text-sm text-amber-600">
              Esta Familia todavía no tiene Variedades disponibles.
            </p>
          )}

          {!isLoading && variedades.length > 0 && units.length === 0 && (
            <p className="text-sm text-gray-500">No hay unidades para configurar.</p>
          )}

          <div className="space-y-4">
            {units.map((unit, unitIndex) => (
              <div key={unitIndex} className="border border-gray-200 rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">
                    Unidad {unitIndex + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium ${
                        isUnitValid(unit) ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {unit.length}/{min === max ? min : `${min}-${max}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeUnit(unitIndex)}
                      className="text-xs text-gray-400 hover:text-red-500"
                      aria-label={`Quitar unidad ${unitIndex + 1}`}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {variedades.map((variedad) => {
                    const checked = unit.some((v) => v.id === variedad.id);
                    return (
                      <label
                        key={variedad.id}
                        className={`flex items-center gap-1.5 text-sm px-2 py-1 rounded border cursor-pointer ${
                          checked
                            ? 'bg-green-50 border-green-400 text-green-800'
                            : 'border-gray-200 text-gray-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleVariedad(unitIndex, { id: variedad.id, name: variedad.name })
                          }
                        />
                        {variedad.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {formError && <p className="text-sm text-red-600 mt-3">{formError}</p>}
        </div>

        <div className="flex-shrink-0 px-6 pb-6 pt-2 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-4 rounded transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!allUnitsValid || isLoading}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default SurtidoVariedadesModal;

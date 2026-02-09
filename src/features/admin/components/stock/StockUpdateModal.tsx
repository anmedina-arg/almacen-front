'use client';

import { useState, useEffect } from 'react';
import { useUpsertStock } from '../../hooks/useUpsertStock';
import { stockUpdateSchema } from '../../schemas/stockUpdateSchema';
import type { ProductStockView, StockMovementType } from '../../types/stock.types';

interface StockUpdateModalProps {
  product: ProductStockView;
  onClose: () => void;
}

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  manual_adjustment: 'Ajuste manual',
  initial_count: 'Conteo inicial',
  correction: 'Correccion',
  loss: 'Perdida / Merma',
  sale: 'Venta',
  purchase: 'Compra / Reposicion',
  return: 'Devolucion',
};

/**
 * Modal para actualizar el stock de un producto.
 * Permite modificar cantidad, stock minimo, tipo de movimiento y notas.
 */
export function StockUpdateModal({ product, onClose }: StockUpdateModalProps) {
  const upsertMutation = useUpsertStock();

  const [quantity, setQuantity] = useState<string>(
    product.quantity !== null ? String(Number(product.quantity)) : '0'
  );
  const [minStock, setMinStock] = useState<string>(
    product.min_stock !== null ? String(Number(product.min_stock)) : ''
  );
  const [movementType, setMovementType] = useState<StockMovementType>(
    product.quantity === null ? 'initial_count' : 'manual_adjustment'
  );
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !upsertMutation.isPending) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [onClose, upsertMutation.isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedQuantity = parseFloat(quantity);
    const parsedMinStock = minStock.trim() === '' ? null : parseFloat(minStock);

    // Validar con Zod
    const result = stockUpdateSchema.safeParse({
      productId: product.product_id,
      quantity: parsedQuantity,
      minStock: parsedMinStock,
      movementType,
      notes,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    // Mapear a los parametros del RPC
    upsertMutation.mutate(
      {
        p_product_id: product.product_id,
        p_quantity: result.data.quantity,
        p_min_stock: result.data.minStock,
        p_notes: result.data.notes || null,
        p_movement_type: result.data.movementType,
      },
      {
        onSuccess: () => onClose(),
      }
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      aria-hidden="true"
      onClick={(e) => {
        // Close modal when clicking overlay (not the modal content)
        if (e.target === e.currentTarget && !upsertMutation.isPending) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 id="modal-title" className="text-xl font-bold text-gray-800">Actualizar Stock</h2>
            <p className="text-sm text-gray-500 truncate">{product.product_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>

        {/* Informacion actual */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-gray-500">Stock actual:</span>{' '}
              <span className="font-semibold text-gray-800">
                {product.quantity !== null ? Number(product.quantity) : 'No configurado'}
              </span>
            </div>
            {product.min_stock !== null && (
              <div>
                <span className="text-gray-500">Minimo:</span>{' '}
                <span className="font-semibold text-gray-800">{Number(product.min_stock)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Error de API */}
        {upsertMutation.isError && (
          <div className="mx-6 mt-4 rounded-md bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-800">
              {(upsertMutation.error as Error)?.message || 'Error al actualizar el stock'}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Cantidad */}
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Nueva cantidad *
            </label>
            <input
              id="quantity"
              type="number"
              step="0.001"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={upsertMutation.isPending}
              placeholder="Ej: 50"
            />
            {errors.quantity && (
              <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
            )}
          </div>

          {/* Stock minimo */}
          <div>
            <label htmlFor="minStock" className="block text-sm font-medium text-gray-700 mb-1">
              Stock minimo (para alertas)
            </label>
            <input
              id="minStock"
              type="number"
              step="0.001"
              min="0"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              disabled={upsertMutation.isPending}
              placeholder="Dejar vacio para no configurar alerta"
            />
            {errors.minStock && (
              <p className="mt-1 text-sm text-red-600">{errors.minStock}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Si el stock cae por debajo de este valor, se mostrara una alerta.
            </p>
          </div>

          {/* Tipo de movimiento */}
          <div>
            <label htmlFor="movementType" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de movimiento *
            </label>
            <select
              id="movementType"
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as StockMovementType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              disabled={upsertMutation.isPending}
            >
              {Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {errors.movementType && (
              <p className="mt-1 text-sm text-red-600">{errors.movementType}</p>
            )}
          </div>

          {/* Notas */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notas (opcional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              disabled={upsertMutation.isPending}
              placeholder="Ej: Conteo fisico realizado, Ajuste por merma..."
            />
            <p className="mt-1 text-xs text-gray-500 text-right">
              {notes.length}/500
            </p>
            {errors.notes && (
              <p className="mt-1 text-sm text-red-600">{errors.notes}</p>
            )}
          </div>

          {/* Error de mutacion */}
          {upsertMutation.error && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-800">
                {(upsertMutation.error as Error).message}
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={upsertMutation.isPending}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={upsertMutation.isPending}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
            >
              {upsertMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

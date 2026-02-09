'use client';

import { useEffect } from 'react';
import { useStockHistory } from '../../hooks/useStockHistory';
import type { StockMovementType } from '../../types/stock.types';

interface StockHistoryModalProps {
  productId: number;
  productName: string;
  onClose: () => void;
}

const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  manual_adjustment: 'Ajuste manual',
  initial_count: 'Conteo inicial',
  correction: 'Correccion',
  loss: 'Perdida',
  sale: 'Venta',
  purchase: 'Compra',
  return: 'Devolucion',
};

const MOVEMENT_TYPE_COLORS: Record<StockMovementType, string> = {
  manual_adjustment: 'bg-blue-100 text-blue-700',
  initial_count: 'bg-purple-100 text-purple-700',
  correction: 'bg-yellow-100 text-yellow-700',
  loss: 'bg-red-100 text-red-700',
  sale: 'bg-orange-100 text-orange-700',
  purchase: 'bg-green-100 text-green-700',
  return: 'bg-teal-100 text-teal-700',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Modal que muestra el historial de movimientos de stock de un producto.
 * Presenta una tabla con fecha, tipo, cantidades, diferencia y notas.
 */
export function StockHistoryModal({ productId, productName, onClose }: StockHistoryModalProps) {
  const { data: movements, isLoading, error } = useStockHistory(productId);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      aria-hidden="true"
      onClick={(e) => {
        // Close modal when clicking overlay
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-modal-title"
      >
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 id="history-modal-title" className="text-xl font-bold text-gray-800">Historial de Movimientos</h2>
            <p className="text-sm text-gray-500 truncate">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-red-800">Error al cargar historial: {(error as Error).message}</p>
            </div>
          )}

          {movements && movements.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No hay movimientos registrados para este producto.</p>
            </div>
          )}

          {movements && movements.length > 0 && (
            <>
              {/* Vista Desktop: Tabla */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Fecha</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Tipo</th>
                      <th className="text-right py-3 px-3 font-semibold text-gray-600">Anterior</th>
                      <th className="text-right py-3 px-3 font-semibold text-gray-600">Nuevo</th>
                      <th className="text-right py-3 px-3 font-semibold text-gray-600">Diferencia</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-600">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => {
                      const changeQty = Number(movement.change_qty);
                      const isPositive = changeQty > 0;
                      const isNegative = changeQty < 0;

                      return (
                        <tr
                          key={movement.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                            {formatDate(movement.created_at)}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                MOVEMENT_TYPE_COLORS[movement.movement_type] || 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {MOVEMENT_TYPE_LABELS[movement.movement_type] || movement.movement_type}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right text-gray-700 font-mono">
                            {Number(movement.previous_qty)}
                          </td>
                          <td className="py-3 px-3 text-right text-gray-700 font-mono">
                            {Number(movement.new_qty)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold">
                            <span
                              className={
                                isPositive
                                  ? 'text-green-600'
                                  : isNegative
                                  ? 'text-red-600'
                                  : 'text-gray-500'
                              }
                            >
                              {isPositive ? '+' : ''}
                              {changeQty}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-gray-500 max-w-[200px] truncate" title={movement.notes || ''}>
                            {movement.notes || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Vista Mobile: Cards */}
              <div className="md:hidden space-y-3">
                {movements.map((movement) => {
                  const changeQty = Number(movement.change_qty);
                  const isPositive = changeQty > 0;
                  const isNegative = changeQty < 0;

                  return (
                    <div
                      key={movement.id}
                      className="border border-gray-200 rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            MOVEMENT_TYPE_COLORS[movement.movement_type] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {MOVEMENT_TYPE_LABELS[movement.movement_type] || movement.movement_type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(movement.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-500">
                          {Number(movement.previous_qty)}
                        </span>
                        <span className="text-gray-400">&rarr;</span>
                        <span className="font-semibold text-gray-700">
                          {Number(movement.new_qty)}
                        </span>
                        <span
                          className={`font-semibold font-mono ${
                            isPositive
                              ? 'text-green-600'
                              : isNegative
                              ? 'text-red-600'
                              : 'text-gray-500'
                          }`}
                        >
                          ({isPositive ? '+' : ''}{changeQty})
                        </span>
                      </div>

                      {movement.notes && (
                        <p className="text-xs text-gray-500">{movement.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

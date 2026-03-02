'use client';

import { useState } from 'react';
import { useOrderDetail } from '../../hooks/useOrderDetail';
import { useConfirmOrder } from '../../hooks/useConfirmOrder';
import { useCancelOrder } from '../../hooks/useCancelOrder';
import { useUpdateOrder } from '../../hooks/useUpdateOrder';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderItemsEditor } from './OrderItemsEditor';
import { formatAdminDate } from '../../utils/formatDate';

interface OrderDetailModalProps {
  orderId: number;
  onClose: () => void;
}

export function OrderDetailModal({ orderId, onClose }: OrderDetailModalProps) {
  const { data: order, isLoading, error } = useOrderDetail(orderId);
  const confirmOrder = useConfirmOrder();
  const cancelOrder = useCancelOrder();
  const updateOrder = useUpdateOrder();

  const [showWhatsAppMessage, setShowWhatsAppMessage] = useState(false);

  const handleConfirm = () => {
    if (!confirm('Confirmar este pedido?')) return;
    confirmOrder.mutate(orderId);
  };

  const handleCancel = () => {
    if (!confirm('Cancelar este pedido? Se devolverá el stock de todos los productos.')) return;
    cancelOrder.mutate(orderId);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Detalle de pedido"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h3 className="text-lg font-bold text-gray-800">
            Pedido #{orderId}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-5">
          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-red-800 text-sm">
                Error: {(error as Error).message}
              </p>
            </div>
          )}

          {order && (
            <>
              {/* Order info */}
              <div className="space-y-3">
                {(() => {
                  const totalCost = order.order_items.reduce(
                    (sum, item) => sum + Number(item.unit_cost) * Number(item.quantity),
                    0
                  );
                  const hasCostData = totalCost > 0;
                  const margin = Number(order.total) - totalCost;
                  const marginPct = Number(order.total) > 0 ? (margin / Number(order.total)) * 100 : 0;
                  const isPositive = margin >= 0;
                  return (
                    <div className="flex items-start justify-between">
                      <OrderStatusBadge status={order.status} />
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-800">
                          ${Number(order.total).toFixed(2)}
                        </p>
                        {hasCostData ? (
                          <p className={`text-sm font-medium mt-0.5 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            Margen: ${margin.toFixed(2)} ({marginPct.toFixed(1)}%)
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 mt-0.5">Sin datos de costo</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Creado:</span>
                    <p className="font-medium text-gray-800">
                      {formatAdminDate(order.created_at)}
                    </p>
                  </div>
                  {order.confirmed_at && (
                    <div>
                      <span className="text-gray-500">Confirmado:</span>
                      <p className="font-medium text-gray-800">
                        {formatAdminDate(order.confirmed_at)}
                      </p>
                    </div>
                  )}
                </div>

                {order.notes && (
                  <div>
                    <span className="text-xs text-gray-500">Notas:</span>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded p-2">
                      {order.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Divider */}
              <hr className="border-gray-200" />

              {/* Items editor */}
              <OrderItemsEditor
                orderId={orderId}
                items={order.order_items || []}
                orderStatus={order.status}
              />

              {/* Divider */}
              <hr className="border-gray-200" />

              {/* WhatsApp message toggle */}
              {order.whatsapp_message && (
                <div>
                  <button
                    onClick={() => setShowWhatsAppMessage(!showWhatsAppMessage)}
                    className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
                  >
                    {showWhatsAppMessage
                      ? 'Ocultar mensaje de WhatsApp'
                      : 'Ver mensaje de WhatsApp original'}
                  </button>
                  {showWhatsAppMessage && (
                    <div className="mt-2 bg-green-50 border-l-4 border-green-500 rounded p-3">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                        {order.whatsapp_message}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              {order.status === 'pending' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleConfirm}
                    disabled={confirmOrder.isPending}
                    className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {confirmOrder.isPending
                      ? 'Confirmando...'
                      : 'Confirmar pedido'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelOrder.isPending}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancelOrder.isPending
                      ? 'Cancelando...'
                      : 'Cancelar pedido'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

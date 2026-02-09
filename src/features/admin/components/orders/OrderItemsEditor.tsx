'use client';

import { useState } from 'react';
import type { OrderItem, OrderStatus } from '../../types/order.types';
import { useRemoveOrderItem } from '../../hooks/useRemoveOrderItem';
import { useUpdateOrderItem } from '../../hooks/useUpdateOrderItem';
import { useAddOrderItem } from '../../hooks/useAddOrderItem';
import { useAdminProducts } from '../../hooks/useAdminProducts';

interface OrderItemsEditorProps {
  orderId: number;
  items: OrderItem[];
  orderStatus: OrderStatus;
}

export function OrderItemsEditor({
  orderId,
  items,
  orderStatus,
}: OrderItemsEditorProps) {
  const removeItem = useRemoveOrderItem();
  const updateItem = useUpdateOrderItem();
  const addItem = useAddOrderItem();
  const { data: products } = useAdminProducts();

  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [newQuantity, setNewQuantity] = useState<string>('1');

  const isPending = orderStatus === 'pending';

  const handleStartEdit = (item: OrderItem) => {
    setEditingItemId(item.id);
    setEditQuantity(String(item.quantity));
    setEditPrice(String(item.unit_price));
  };

  const handleSaveEdit = (itemId: number) => {
    const quantity = parseFloat(editQuantity);
    const unitPrice = parseFloat(editPrice);

    if (isNaN(quantity) || quantity <= 0) return;
    if (isNaN(unitPrice) || unitPrice < 0) return;

    updateItem.mutate(
      {
        orderId,
        itemId,
        updates: { quantity, unit_price: unitPrice },
      },
      {
        onSuccess: () => setEditingItemId(null),
      }
    );
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
  };

  const handleRemoveItem = (itemId: number) => {
    if (!confirm('Eliminar este item del pedido?')) return;
    removeItem.mutate({ orderId, itemId });
  };

  const handleAddItem = () => {
    if (!selectedProductId) return;
    const product = products?.find((p) => p.id === parseInt(selectedProductId));
    if (!product) return;

    const quantity = parseFloat(newQuantity);
    if (isNaN(quantity) || quantity <= 0) return;

    addItem.mutate(
      {
        orderId,
        item: {
          product_id: product.id,
          product_name: product.name,
          quantity,
          unit_price: product.price,
          is_by_weight: false,
        },
      },
      {
        onSuccess: () => {
          setShowAddForm(false);
          setSelectedProductId('');
          setNewQuantity('1');
        },
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">
          Items del pedido ({items.length})
        </h4>
        {isPending && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            {showAddForm ? 'Cancelar' : '+ Agregar item'}
          </button>
        )}
      </div>

      {/* Add item form */}
      {showAddForm && isPending && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3 space-y-2">
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">Seleccionar producto...</option>
            {products
              ?.filter((p) => p.active)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} - ${p.price}
                </option>
              ))}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              min="0.1"
              step="0.1"
              placeholder="Cantidad"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={handleAddItem}
              disabled={!selectedProductId || addItem.isPending}
              className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addItem.isPending ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="divide-y divide-gray-100">
        {items.map((item) => (
          <div
            key={item.id}
            className="py-2 flex items-center gap-3"
          >
            {editingItemId === item.id ? (
              /* Edit mode */
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-gray-800">
                  {item.product_name}
                </p>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Cantidad</label>
                    <input
                      type="number"
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(e.target.value)}
                      min="0.1"
                      step="0.1"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500">Precio unit.</label>
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(item.id)}
                    disabled={updateItem.isPending}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updateItem.isPending ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              /* View mode */
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.quantity} x ${Number(item.unit_price).toFixed(2)}
                  </p>
                </div>
                <div className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                  ${Number(item.subtotal).toFixed(2)}
                </div>
                {isPending && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleStartEdit(item)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Editar item"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={removeItem.isPending}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      title="Eliminar item"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          No hay items en este pedido
        </p>
      )}
    </div>
  );
}

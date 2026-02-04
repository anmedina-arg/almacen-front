'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useDeleteProduct } from '../hooks/useDeleteProduct';
import { useToggleProductActive } from '../hooks/useToggleProductActive';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import type { Product } from '@/types';

interface AdminProductCardProps {
  product: Product;
  onEdit: () => void;
}

export function AdminProductCard({ product, onEdit }: AdminProductCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const deleteMutation = useDeleteProduct();
  const toggleMutation = useToggleProductActive();

  const handleDelete = () => {
    deleteMutation.mutate(product.id, {
      onSuccess: () => setShowDeleteModal(false),
    });
  };

  const handleToggle = () => {
    toggleMutation.mutate(product.id);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
        {/* Imagen */}
        <div className="relative w-full aspect-square bg-gray-100">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              width={400}
              height={400}
              className="w-full h-full object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <span className="text-gray-400 text-sm">Sin imagen</span>
            </div>
          )}
          {!product.active && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                Inactivo
              </span>
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-gray-800 truncate" title={product.name}>
              {product.name}
            </h3>
            <p className="text-lg font-bold text-green-600">${product.price.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-1">{product.mainCategory}</p>
          </div>

          {/* Botones de acción */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onEdit}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Editar
            </button>

            <button
              onClick={handleToggle}
              disabled={toggleMutation.isPending}
              className={`px-3 py-2 rounded-md transition-colors text-sm font-medium disabled:opacity-50 ${
                product.active
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {toggleMutation.isPending
                ? '...'
                : product.active
                ? 'Desactivar'
                : 'Activar'}
            </button>
          </div>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Eliminar
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <DeleteConfirmationModal
          productName={product.name}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </>
  );
}

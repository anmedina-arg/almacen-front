'use client';

import { memo } from 'react';
import Image from 'next/image';
import type { WeightType } from '@/features/catalog/types';
import { getQuantityPerClick } from '@/features/catalog/utils/productUtils';
import { QuantityButton } from '@/components/ui/QuantityButton';
import type { ProductStockView } from '../../types/stock.types';
import { formatQuantity } from '@/utils/formatQuantity';
export interface StockEntryCardProduct extends ProductStockView {
  sale_type: WeightType;
}

interface StockEntryCardProps {
  product: StockEntryCardProduct;
  increment: number;
  notes: string;
  onAdd: (productId: number) => void;
  onRemove: (productId: number) => void;
  onNotesChange: (productId: number, notes: string) => void;
}

function StockEntryCardBase({
  product,
  increment,
  notes,
  onAdd,
  onRemove,
  onNotesChange,
}: StockEntryCardProps) {
  const weightType = product.sale_type;
  const hasEntry = increment > 0;
  const amountPerClick = getQuantityPerClick({
    name: product.product_name,
    sale_type: product.sale_type,
  });

  const currentStockLabel =
    product.quantity !== null
      ? formatQuantity(product.quantity, weightType)
      : 'Sin stock configurado';

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
      <div className="flex items-center gap-3">
        {/* Imagen */}
        <Image
          src={product.product_image}
          alt={product.product_name}
          width={48}
          height={48}
          className="object-cover rounded-md w-12 h-12 flex-shrink-0"
          loading="lazy"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {product.product_name}
          </h3>
          <p className="text-xs text-gray-500">
            {product.main_category} · ${product.product_price}
          </p>
          <p className="text-xs text-gray-400">Stock actual: {currentStockLabel}</p>
        </div>

        {/* Controles */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {hasEntry && (
            <span className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
              +{formatQuantity(increment, weightType)}
            </span>
          )}
          <div className="flex items-center gap-2">
            <QuantityButton
              variant="decrement"
              onClick={() => onRemove(product.product_id)}
              disabled={increment < amountPerClick}
              aria-label={`Quitar ${product.product_name}`}
            />
            <QuantityButton
              variant="increment"
              onClick={() => onAdd(product.product_id)}
              aria-label={`Agregar ${product.product_name}`}
            />
          </div>
        </div>
      </div>

      {/* Notas — solo visibles cuando hay entrada pendiente */}
      {hasEntry && (
        <input
          type="text"
          value={notes}
          onChange={(e) => onNotesChange(product.product_id, e.target.value)}
          placeholder="Notas (opcional)..."
          maxLength={500}
          className="mt-2 w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-gray-50"
        />
      )}
    </div>
  );
}

export const StockEntryCard = memo(StockEntryCardBase);
StockEntryCard.displayName = 'StockEntryCard';

import { memo } from 'react';
import Image from 'next/image';
import type { ProductWithOptionalDescription } from '@/types';
import { getWeightType } from '@/utils/productUtils';
import { isSinStock } from '@/features/catalog/utils/sinStock';
import { QuantityStepper } from '@/features/catalog/components/QuantityStepper';
import { PrecioOculto } from '@/components/ui/PrecioOculto';
import { ComboDisclosure } from '@/components/ui/ComboDisclosure';
import { formatQuantity } from '@/utils/formatQuantity';
import { getCloudinaryUrl } from '@/utils/cloudinaryUrl';

export interface ProductCardProps {
  product: ProductWithOptionalDescription;
  quantity: number;
  onAdd: (id: number) => void;
  onRemove: (id: number) => void;
  priority?: boolean;
}

function ProductCardBase({
  product,
  quantity,
  onAdd,
  onRemove,
  priority = false,
}: ProductCardProps) {
  const weightType = getWeightType(product);
  const isOutOfStock = isSinStock(product);
  const isAtStockLimit = product.stock_quantity !== undefined &&
    product.stock_quantity > 0 &&
    quantity >= product.stock_quantity;

  const hasComboItems = product.is_combo && product.combo_items && product.combo_items.length > 0;

  return (
    <div
      className={`flex w-full items-center justify-between border rounded-lg shadow-sm hover:shadow-md transition-shadow ${
        quantity > 0 && !isOutOfStock ? 'border-selected-green bg-selected-wash' : 'border-gray-200'
      }`}
    >
      <div className={`flex ${'description' in product ? 'flex-col' : 'flex-row'} items-center gap-3`}>
        {product.price !== 0 && (
          <div className="flex-shrink-0 relative">
            <Image
              src={getCloudinaryUrl(product.image, 160)}
              alt={product.name}
              width={80}
              height={80}
              className="object-cover rounded-tl-lg rounded-bl-lg w-20 h-20"
              priority={priority}
              loading={priority ? undefined : 'lazy'}
            />
            {product.is_combo && (
              <span className="absolute top-1 left-1 bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                COMBO
              </span>
            )}
          </div>
        )}
        <div className="text-ellipsis">
          {product.is_top_seller && (
            <span className="inline-block bg-amber-400 text-amber-900 text-xs font-bold px-1.5 py-0.5 rounded mb-0.5">
              ⭐ Más vendido
            </span>
          )}
          <h2 className="text-sm font-bold">{product.name}</h2>
          {product.price !== 0 && (
            isOutOfStock ? (
              <PrecioOculto className="h-6" />
            ) : (
              <p className="text-base font-semibold text-action-green">
                ${product.price}
              </p>
            )
          )}
          {hasComboItems && (
            <ComboDisclosure items={product.combo_items!} />
          )}
          {'description' in product && (
            <ul className="text-xs text-gray-300 mt-1">
              {product.description.map((item, idx) => (
                <li key={idx}>
                  {item.text}
                  {item.subItems && (
                    <ul>
                      {item.subItems.map((sub, i) => (
                        <li key={i} className="text-xs text-gray-500 mt-1">{sub}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 pr-2">
        {isOutOfStock ? (
          <span className="text-xs font-semibold text-white bg-red-500 px-2 py-1 rounded-md">
            Sin Stock
          </span>
        ) : (
          product.price !== 0 && (
            <QuantityStepper
              productName={product.name}
              quantity={quantity}
              quantityLabel={formatQuantity(quantity, weightType)}
              isAtStockLimit={isAtStockLimit}
              onAdd={() => onAdd(product.id)}
              onRemove={() => onRemove(product.id)}
            />
          )
        )}
      </div>
    </div>
  );
}

export const ProductCard = memo(ProductCardBase);
ProductCard.displayName = 'ProductCard';

export default ProductCard;

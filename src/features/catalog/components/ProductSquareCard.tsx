'use client';

import { memo } from 'react';
import Image from 'next/image';
import type { ProductCardProps } from '@/components/ProductCard';
import { getWeightType } from '../utils/productUtils';
import { isSinStock } from '../utils/sinStock';
import { QuantityStepper } from './QuantityStepper';
import { PrecioOculto } from '@/components/ui/PrecioOculto';
import { formatQuantity } from '@/utils/formatQuantity';
import { getCloudinaryUrl } from '@/utils/cloudinaryUrl';

function ProductSquareCardBase({
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

	return (
		<div
			className={`flex flex-col items-center w-full border rounded-lg min-h-64 shadow-sm hover:shadow-md transition-shadow ${
				quantity > 0 && !isOutOfStock ? 'border-selected-green bg-selected-wash' : 'border-gray-200'
			}`}
		>
			<div className="relative w-full h-32 rounded-t-lg overflow-hidden flex-shrink-0">
				<Image
					src={getCloudinaryUrl(product.image, 400)}
					alt={product.name}
					fill
					className="object-cover"
					priority={priority}
					loading={priority ? undefined : 'lazy'}
					sizes="(max-width: 640px) 45vw, 200px"
				/>
			</div>
			<div className="flex flex-col justify-between items-center flex-grow-1">
				<h2 className="text-lg font-light text-ellipsis line-clamp-2 text-center text-balance tracking-wide">{product.name}</h2>

				{'description' in product && (
					<ul className="text-xs text-gray-300 mt-1">
						{product.description.map((item, idx) => (
							<li key={idx}>
								{item.text}
								{item.subItems && (
									<ul>
										{item.subItems.map((sub, i) => (
											<li key={i} className="text-xs text-gray-500 mt-1">
												{sub}
											</li>
										))}
									</ul>
								)}
							</li>
						))}
					</ul>
				)}

				{isOutOfStock ? (
					<div className="flex items-center gap-2 flex-shrink-0 flex-col">
						<PrecioOculto className="h-7" />
						<span className="text-xs font-semibold text-white bg-red-500 px-2 py-1 rounded-md">
							Sin Stock
						</span>
					</div>
				) : (
					<div className="flex items-center gap-2 flex-shrink-0 flex-col pb-2">
						<p className="text-xl font-semibold text-action-green">
							${product.price}
						</p>

						<QuantityStepper
							productName={product.name}
							quantity={quantity}
							quantityLabel={formatQuantity(quantity, weightType)}
							isAtStockLimit={isAtStockLimit}
							onAdd={() => onAdd(product.id)}
							onRemove={() => onRemove(product.id)}
						/>
					</div>
				)}
			</div>
		</div>
	);
}

export const ProductSquareCard = memo(ProductSquareCardBase);
ProductSquareCard.displayName = 'ProductSquareCard';

export default ProductSquareCard;

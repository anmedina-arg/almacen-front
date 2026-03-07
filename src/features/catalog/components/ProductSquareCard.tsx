'use client';

import { memo } from 'react';
import Image from 'next/image';
import type { ProductCardProps } from '../types';
import { getWeightType } from '../utils/productUtils';
import { QuantityButton } from '@/components/ui/QuantityButton';
import { formatQuantity } from '@/utils/formatQuantity';

function ProductSquareCardBase({
	product,
	quantity,
	onAdd,
	onRemove,
}: ProductCardProps) {
	const weightType = getWeightType(product);
	const isOutOfStock = product.stock_quantity === 0;
	const isAtStockLimit = product.stock_quantity !== undefined &&
		product.stock_quantity > 0 &&
		quantity >= product.stock_quantity;

	return (
		<div className="flex flex-col items-center w-full border border-gray-200 rounded-lg min-h-64 shadow-sm hover:shadow-md transition-shadow">
			<Image
				src={product.image}
				alt={product.name}
				width={80}
				height={80}
				className="object-cover rounded-lg rounded-br-none rounded-bl-none h-32 w-full"
				loading="lazy"
				sizes="(max-width: 768px) 100vw, 80px"
			/>
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
						<p className="text-xl font-semibold text-green-600">
							${product.price}
						</p>
						<span className="text-xs font-semibold text-white bg-red-500 px-2 py-1 rounded-md">
							Sin Stock
						</span>
					</div>
				) : (
					<div className="flex items-center gap-2 flex-shrink-0 flex-col">
						{quantity > 0 && (
							<span className="text-sm font-bold text-green-700 min-w-[50px] text-center bg-green-50 px-2 py-0.5 rounded-md">
								{formatQuantity(quantity, weightType)}
							</span>
						)}

						<div className="flex items-center gap-2">
							<p className="text-xl font-semibold text-green-600">
								${product.price}
							</p>

							<QuantityButton variant="decrement" onClick={() => onRemove(product.id)} disabled={quantity === 0} aria-label={`Quitar ${product.name}`} />

							<QuantityButton variant="increment" onClick={() => onAdd(product.id)} disabled={isAtStockLimit} aria-label={`Agregar ${product.name}`} />
						</div>

						{isAtStockLimit && (
							<span className="text-xs text-orange-500 font-medium text-center leading-tight">
								Máx. disponible
							</span>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

export const ProductSquareCard = memo(ProductSquareCardBase);
ProductSquareCard.displayName = 'ProductSquareCard';

export default ProductSquareCard;

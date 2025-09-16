'use client';

import React from 'react';
import Image from 'next/image';
import { ProductCardProps } from '@/types';
import { getWeightType, formatQuantity } from '@/utils/productUtils';

/**
 * Componente de tarjeta de producto optimizado
 */
const ProductCard: React.FC<ProductCardProps> = React.memo(({
	product,
	quantity,
	onAdd,
	onRemove
}) => {
	const weightType = getWeightType(product.name);

	return (
		<div className="flex w-full items-center justify-between border border-gray-200 rounded-lg p-3 min-h-24 shadow-sm hover:shadow-md transition-shadow">
			<div className={`flex ${'description' in product ? 'flex-col' : 'flex-row'} items-center gap-3`}>
				{product.price !== 0 && (
					<div className="flex-shrink-0">
						<Image
							src={product.image}
							alt={product.name}
							width={80}
							height={80}
							className="object-cover rounded-lg w-20 h-20"
							loading="lazy"
							sizes="(max-width: 768px) 100vw, 80px"
						/>
					</div>
				)
				}
				<div className="text-ellipsis">
					<h2 className="text-sm font-bold ">
						{product.name}
					</h2>
					{product.price !== 0 && (
						<p className="text-base font-semibold text-green-600">
							${product.price}
						</p>
					)}
					{'description' in product && (
						<ul className="text-xs text-gray-300 mt-1">
							{product.description.map((item, idx) => (
								<li key={idx}>
									{item.text}
									{item.subItems && (
										<ul>
											{item.subItems.map((sub, i) => <li key={i} className="text-xs text-gray-500 mt-1">{sub}</li>)}
										</ul>
									)}
								</li>
							))}
						</ul>
					)}
				</div>
			</div>

			<div className="flex items-center gap-2 flex-shrink-0">
				{quantity > 0 && (
					<span className="text-sm font-bold text-green-700 min-w-[50px] text-center bg-green-50 px-2 py-1 rounded-md">
						{formatQuantity(quantity, weightType)}
					</span>
				)}

				{product.price !== 0 && (
					<>
						<button
							onClick={() => onRemove(product)}
							className="bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={quantity === 0}
							aria-label={`Quitar ${product.name}`}
						>
							-
						</button>

						<button
							onClick={() => onAdd(product)}
							className="bg-green-500 hover:bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold transition-colors"
							aria-label={`Agregar ${product.name}`}
						>
							+
						</button>
					</>

				)}
			</div>
		</div>
	);
});

ProductCard.displayName = 'ProductCard';

export default ProductCard; 
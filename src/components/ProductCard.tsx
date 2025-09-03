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
	//${'description' in product ? 'flex-col' : 'flex-row'}
	return (
		<div className="flex ">
			<div className={`flex flex-col items-center gap-3 w-full justify-between border border-gray-200 rounded-lg min-h-24 shadow-sm hover:shadow-md transition-shadow`}>
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
				<div className="text-ellipsis">
					<h2 className="text-xl">
						{product.name}
					</h2>

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
					<div className="flex items-center gap-2 flex-shrink-0">
						{quantity > 0 && (
							<span className="text-sm font-bold text-green-700 min-w-[50px] text-center bg-green-50 px-2 py-1 rounded-md">
								{formatQuantity(quantity, weightType)}
							</span>
						)}


						<>
							<p className="text-base font-semibold text-green-600">
								${product.price}
							</p>
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
					</div>
				</div>
			</div>
		</div>
	);
});

ProductCard.displayName = 'ProductCard';

export default ProductCard; 
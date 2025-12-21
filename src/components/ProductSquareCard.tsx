'use client';

import React from 'react';
import Image from 'next/image';
import { ProductCardProps } from '@/types';
import { getWeightType, formatQuantity } from '@/utils/productUtils';
import QuantityButton from './ui/QuantityButton';

/**
 * Componente de tarjeta de producto optimizado
 */
const ProductSquareCard: React.FC<ProductCardProps> = React.memo(
	({ product, quantity, onAdd, onRemove }) => {
		const weightType = getWeightType(product.name);
		//${'description' in product ? 'flex-col' : 'flex-row'}
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

							<QuantityButton variant="increment" onClick={() => onAdd(product.id)} aria-label={`Agregar ${product.name}`} />
						</div>
					</div>
				</div>
			</div>
		);
	}
);

ProductSquareCard.displayName = 'ProductSquareCard';

export default ProductSquareCard;

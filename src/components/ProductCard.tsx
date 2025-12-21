'use client';

import React from 'react';
import Image from 'next/image';
import { ProductCardProps } from '@/types';
import { getWeightType, formatQuantity } from '@/utils/productUtils';
import QuantityButton from './ui/QuantityButton';

const ProductCard: React.FC<ProductCardProps> = React.memo(({
	product,
	quantity,
	onAdd,
	onRemove
}) => {
	const weightType = getWeightType(product.name);

	console.count(`ProductCard ${product.id} render`);

	return (
		<div className="flex w-full items-center justify-between border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
			<div className={`flex ${'description' in product ? 'flex-col' : 'flex-row'} items-center gap-3`}>
				{product.price !== 0 && (
					<div className="flex-shrink-0">
						<Image
							src={product.image}
							alt={product.name}
							width={80}
							height={80}
							className="object-cover rounded-tl-lg rounded-bl-lg w-20 h-20"
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
					<div className='flex flex-col gap-1'>
						{quantity > 0 &&
							<QuantityButton variant="decrement" onClick={() => onRemove(product)} disabled={quantity === 0} aria-label={`Quitar ${product.name}`} />
						}
						<QuantityButton variant="increment" onClick={() => onAdd(product)} aria-label={`Agregar ${product.name}`} />
					</div>

				)}
			</div>
		</div>
	);
});

ProductCard.displayName = 'ProductCard';

export default ProductCard; 
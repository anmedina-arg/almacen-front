'use client';

import React from 'react';
import { Product } from '@/types';
import ProductCard from './ProductCard';

interface ProductWithHandlers extends Product {
	quantity: number;
	onAdd: (product: Product) => void;
	onRemove: (product: Product) => void;
}

interface ProductListProps {
	products: ProductWithHandlers[];
	categories?: string[];
}

/**
 * Componente de lista de productos
 */
const ProductList: React.FC<ProductListProps> = ({ products, categories }) => {
	// Si no hay categorías, mostrar todos los productos sin agrupar
	if (!categories || categories.length === 0) {
		return (
			<div className="flex flex-col gap-4">
				{products.map((product) => (
					<ProductCard
						key={`${product.id}-${product.name}`}
						product={product}
						quantity={product.quantity}
						onAdd={product.onAdd}
						onRemove={product.onRemove}
					/>
				))}
			</div>
		);
	}

	// Si hay categorías, agrupar y mostrar por categoría
	return (
		<div className="flex flex-col gap-8">
			{categories.map((category) => {
				const categoryProducts = products.filter(
					(product) => product.categories === category
				);

				return (
					<div key={category} className="w-full">
						<h3 className="text-lg font-bold mb-2">
							{category}
						</h3>
						<div className="flex flex-col gap-2">
							{categoryProducts.map((product) => (
								<ProductCard
									key={`${product.id}-${product.name}`}
									product={product}
									quantity={product.quantity}
									onAdd={product.onAdd}
									onRemove={product.onRemove}
								/>
							))}
						</div>
					</div>
				);
			})}
		</div>
	);
};

export default ProductList; 
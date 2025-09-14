'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Product } from '@/types';
import ProductCard from './ProductSquareCard';
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

	const [visibleProducts, setVisibleProducts] = useState(10);
	const loadMoreRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const observer = new IntersectionObserver(
			entries => {
				if (entries[0].isIntersecting) {
					setVisibleProducts(prev => prev + 10); // Carga 10 más
				}
			},
			{ rootMargin: '200px' }
		);

		const currentRef = loadMoreRef.current;
		if (currentRef) {
			observer.observe(currentRef);
		}

		return () => {
			if (currentRef) observer.unobserve(currentRef);
		};
	}, []);

	// Si no hay categorías, mostrar todos los productos sin agrupar
	if (!categories || categories.length === 0) {
		return (
			<>
				<div className="flex flex-col gap-4">
					{products.slice(0, visibleProducts).map((product) => (
						<ProductCard
							key={`${product.id}-${product.name}`}
							product={product}
							quantity={product.quantity}
							onAdd={product.onAdd}
							onRemove={product.onRemove}
						/>
					))}
				</div>
				<div ref={loadMoreRef} className="h-10" />
			</>
		);
	}

	// Si hay categorías, agrupar y mostrar por categoría
	return (
		<>
			<div className="flex flex-col gap-8">
				{categories.map((category) => {
					const categoryProducts = products
						.filter((product) => product.categories === category);

					return (
						<div key={category} id={category} className="w-full scroll-mt-24">
							<h3 className="text-lg font-bold mb-2">
								{category}
							</h3>
							<div className="grid grid-cols-2 gap-2">
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
			<div ref={loadMoreRef} className="h-10" />
		</>
	);
};

export default ProductList; 
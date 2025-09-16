'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Product } from '@/types';
import ProductCard from './ProductCard';
import ProductSquareCard from './ProductSquareCard';
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
	const [showList, setShowList] = useState<string>("list");
	const loadMoreRef = useRef<HTMLDivElement | null>(null);

	console.log(showList)

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
					{products.slice(0, visibleProducts).map((product) =>
						showList === "list" ? (
							<ProductCard
								key={`${product.id}-${product.name}`}
								product={product}
								quantity={product.quantity}
								onAdd={product.onAdd}
								onRemove={product.onRemove}
							/>
						) : (
							<ProductSquareCard
								key={`${product.id}-${product.name}`}
								product={product}
								quantity={product.quantity}
								onAdd={product.onAdd}
								onRemove={product.onRemove}
							/>
						)
					)}
				</div>
				<div ref={loadMoreRef} className="h-10" />
			</>
		);
	}

	// Si hay categorías, agrupar y mostrar por categoría
	return (
		<>
			<div className='flex gap-2'>
				<button onClick={() => setShowList("list")}>Lista</button>
				<button onClick={() => setShowList("grid")}>Cuadrícula</button>
			</div>
			<div className="flex flex-col gap-8">
				{categories.map((category) => {
					const categoryProducts = products
						.filter((product) => product.categories === category);

					return (
						<div key={category} id={category} className="w-full scroll-mt-24">
							<h3 className="text-lg font-bold mb-2">
								{category}
							</h3>
							<div className={`${showList === "list" ? "flex flex-wrap gap-4" : "grid grid-cols-2 gap-2"}`}>
								{categoryProducts.map((product) => (
									showList === "list" ? (
										<ProductCard
											key={`${product.id}-${product.name}`}
											product={product}
											quantity={product.quantity}
											onAdd={product.onAdd}
											onRemove={product.onRemove}
										/>
									) : (
										<ProductSquareCard
											key={`${product.id}-${product.name}`}
											product={product}
											quantity={product.quantity}
											onAdd={product.onAdd}
											onRemove={product.onRemove}
										/>
									)
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
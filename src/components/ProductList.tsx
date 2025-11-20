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
			<div className='flex items-center gap-2 px-4 py-1 backdrop-blur-md bg-white/10 rounded-tl-none rounded-tr-none rounded-bl-2xl rounded-br-2xl'>
				<span className="text-xs text-gray-300">Vista:</span>
				<button
					onClick={() => setShowList("list")}
					aria-label="Vista lista"
					className={`flex items-center justify-center gap-1 border-1 rounded-md px-0.5 py-0.5 transition-colors ${showList === "list"
						? "bg-gray-800 text-white border-gray-500"
						: "bg-transparent text-gray-300 border-transparent"
						}`}
				>
					{/* Botón vista lista */}
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-4 h-4 fill-white stroke-white">
						<rect x="5" y="7" width="22" height="4" rx="2" />
						<rect x="5" y="14" width="22" height="4" rx="2" />
						<rect x="5" y="21" width="22" height="4" rx="2" />
					</svg>
					<span className='text-xs'>Lista</span>
				</button>
				<button
					onClick={() => setShowList("grid")}
					aria-label="Vista grilla"
					className={`flex items-center justify-center gap-1 border-1 rounded-md px-0.5 py-0.5 transition-colors ${showList === "grid"
						? "bg-gray-800 text-white border-gray-500"
						: "bg-transparent text-gray-300 border-transparent"
						}`}
				>
					{/* Botón vista grilla */}
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-4 h-4 fill-white stroke-white">
						<rect x="5" y="7" width="8" height="8" rx="2" />
						<rect x="19" y="7" width="8" height="8" rx="2" />
						<rect x="5" y="17" width="8" height="8" rx="2" />
						<rect x="19" y="17" width="8" height="8" rx="2" />
					</svg>
					<span className='text-xs'>Cuadricula</span>
				</button>
			</div>
			<div className="flex flex-col gap-4">
				{categories.map((category) => {
					const categoryProducts = products
						.filter((product) => product.categories === category);

					return (
						<div key={category} id={category} className="w-full scroll-mt-28">
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
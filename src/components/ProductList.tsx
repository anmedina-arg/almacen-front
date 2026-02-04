'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Product, MainCategory } from '@/types';
import ProductCard from './ProductCard';
import ProductSquareCard from './ProductSquareCard';

interface ProductWithQuantity extends Product {
	quantity: number;
}

interface ProductListProps {
	products: ProductWithQuantity[];
	onAdd: (id: number) => void;
	onRemove: (id: number) => void;
	mainCategories?: MainCategory[];
	searchQuery?: string;
}

/**
 * Componente de lista de productos
 */
const ProductList: React.FC<ProductListProps> = ({ products, mainCategories, searchQuery, onAdd, onRemove }) => {
	const [visibleProducts, setVisibleProducts] = useState(10);
	const [showList, setShowList] = useState<string>("list");
	const loadMoreRef = useRef<HTMLDivElement | null>(null);


	useEffect(() => {
		const observer = new IntersectionObserver(
			entries => {
				if (entries[0].isIntersecting) {
					setVisibleProducts(prev => prev + 10);
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


	const grouped = useMemo(() => {
		if (!mainCategories) return [];

		return mainCategories.map((main) => {
			const mainProducts = products.filter((p) => p.mainCategory === main);

			const subMap = new Map<string, ProductWithQuantity[]>();
			mainProducts.forEach((p) => {
				const subLabel = (p.categories ?? 'Sin categoría').toString().trim();
				if (!subMap.has(subLabel)) subMap.set(subLabel, []);
				subMap.get(subLabel)!.push(p);
			});

			const subcategories = Array.from(subMap.entries()).map(([label, items]) => ({
				key: label.toLowerCase(),
				label,
				products: items,
			}));

			return { main, subcategories };
		});
	}, [products, mainCategories]);

	const [fixHeight, setFixHeight] = useState(false);

	useEffect(() => {
		if (typeof window !== 'undefined' &&
			window.scrollY > 50 &&
			Boolean(searchQuery)) {
			setFixHeight(true);
		}

		return () => { setFixHeight(false) };
	}, [searchQuery])

	console.log(fixHeight);

	console.count('ProductList render');

	return (
		<div className="flex flex-col items-center justify-center gap-4 sm:p-2">
			<div className='flex items-center gap-2 px-4 py-1 backdrop-blur-md bg-white/10 rounded-tl-none rounded-tr-none rounded-bl-2xl rounded-br-2xl'>
				<span className="text-xs text-gray-700">Vista:</span>
				<button
					onClick={() => setShowList("list")}
					aria-label="Vista lista"
					className={`flex items-center justify-center gap-1 border-1 rounded-md px-0.5 py-0.5 transition-colors bg-transparent text-gray-700 ${showList === "list"
						? " border-gray-500"
						: " border-transparent"
						}`}
				>
					{/* Botón vista lista */}
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-4 h-4 fill-white stroke-gray-700">
						<rect x="5" y="7" width="22" height="4" rx="2" />
						<rect x="5" y="14" width="22" height="4" rx="2" />
						<rect x="5" y="21" width="22" height="4" rx="2" />
					</svg>
					<span className='text-xs'>Lista</span>
				</button>
				<button
					onClick={() => setShowList("grid")}
					aria-label="Vista grilla"
					className={`flex items-center justify-center gap-1 border-1 rounded-md px-0.5 py-0.5 transition-colors bg-transparent text-gray-700 ${showList === "grid"
						? "  border-gray-500"
						: "  border-transparent"
						}`}
				>
					{/* Botón vista grilla */}
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-4 h-4 fill-white stroke-gray-700">
						<rect x="5" y="7" width="8" height="8" rx="2" />
						<rect x="19" y="7" width="8" height="8" rx="2" />
						<rect x="5" y="17" width="8" height="8" rx="2" />
						<rect x="19" y="17" width="8" height="8" rx="2" />
					</svg>
					<span className='text-xs'>Cuadricula</span>
				</button>
			</div>

			<div className={`flex flex-col gap-4 ${fixHeight ? 'mt-48' : ''}`}>
				{grouped.map(({ main, subcategories }) => (
					<div
						key={String(main)}
						id={String(main).charAt(0).toUpperCase() + String(main).slice(1)}
						className="w-full scroll-mt-48"
					>
						<div className='flex gap-2 items-baseline'>
							<span className="text-lg font-bold mb-2 capitalize">{String(main)}</span>
							<span className=" font-light text-xs px-1 py-0.5 rounded-md flex items-center justify-center h-auto">({subcategories.length} Categorias)</span>
						</div>

						{subcategories.map((sub) => {
							return (
								<section key={`${String(main)}-${sub.key}`} className="mb-4">
									<div className="flex items-center gap-2 w-full text-md font-semibold mb-2 border-b-1 border-gray-700">
										<span>{sub.label}</span>
										<span className="bg-gray-600 font-light text-xs text-white px-1 py-0.5 rounded-md flex items-center justify-center">{sub.products.length} Productos</span>
									</div>

									<div className={`${showList === "list" ? "flex flex-wrap gap-4" : "grid grid-cols-2 gap-2"}`}>
										{sub.products.map((product) =>
											showList === "list" ? (
												<ProductCard
													key={`${product.id}-${product.name}`}
													product={product}
													quantity={product.quantity}
													onAdd={() => onAdd(product.id)}
													onRemove={() => onRemove(product.id)}
												/>
											) : (
												<ProductSquareCard
													key={`${product.id}-${product.name}`}
													product={product}
													quantity={product.quantity}
													onAdd={onAdd}
													onRemove={onRemove}
												/>
											)
										)}
									</div>
								</section>
							);
						})}
					</div>
				))}
			</div>

			<div ref={loadMoreRef} className="h-10" />
		</ div>
	);
};

export default ProductList;
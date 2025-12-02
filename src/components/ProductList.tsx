'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Product, MainCategory } from '@/types';
import ProductCard from './ProductCard';
import ProductSquareCard from './ProductSquareCard';

interface ProductWithHandlers extends Product {
	quantity: number;
	onAdd: (product: Product) => void;
	onRemove: (product: Product) => void;
}

interface ProductListProps {
	products: ProductWithHandlers[];
	mainCategories?: MainCategory[];
}

/**
 * Componente de lista de productos
 */
const ProductList: React.FC<ProductListProps> = ({ products, mainCategories }) => {

	const [visibleProducts, setVisibleProducts] = useState(10);
	const [showList, setShowList] = useState<string>("list");
	const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
	const [isInitialized, setIsInitialized] = useState(false);
	const loadMoreRef = useRef<HTMLDivElement | null>(null);

	console.log(showList);

	// Inicializar expandedSubcategories con la primera subcategoría de cada mainCategory (solo una vez)
	useEffect(() => {
		if (!isInitialized && mainCategories && mainCategories.length > 0) {
			const defaultExpanded = new Set<string>();
			mainCategories.forEach((main) => {
				const mainProducts = products.filter((p) => p.mainCategory === main);
				if (mainProducts.length > 0) {
					const firstSubLabel = (mainProducts[0].categories ?? 'Sin categoría').toString().trim();
					const key = `${String(main)}-${firstSubLabel.toLowerCase()}`;
					defaultExpanded.add(key);
				}
			});
			setExpandedSubcategories(defaultExpanded);
			setIsInitialized(true);
		}
	}, [isInitialized, mainCategories, products]);

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

	const toggleSubcategory = (key: string) => {
		setExpandedSubcategories(prev => {
			const newSet = new Set(prev);
			if (newSet.has(key)) {
				newSet.delete(key);
			} else {
				newSet.add(key);
			}
			return newSet;
		});
	};

	const grouped = useMemo(() => {
		if (!mainCategories) return [];

		return mainCategories.map((main) => {
			const mainProducts = products.filter((p) => p.mainCategory === main);

			const subMap = new Map<string, ProductWithHandlers[]>();
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

	return (
		<>
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

			<div className="flex flex-col gap-4">
				{grouped.map(({ main, subcategories }) => (
					<div
						key={String(main)}
						id={String(main).charAt(0).toUpperCase() + String(main).slice(1)}
						className="w-full scroll-mt-36"
					>
						<div className='flex gap-2 items-baseline'>
							<span className="text-lg font-bold mb-2 capitalize">{String(main)}</span>
							<span className=" font-light text-xs px-1 py-0.5 rounded-md flex items-center justify-center h-auto">({subcategories.length} Categorias)</span>
						</div>

						{subcategories.map((sub) => {
							const isExpanded = expandedSubcategories.has(`${String(main)}-${sub.key}`);
							return (
								<section key={`${String(main)}-${sub.key}`} className="mb-4">
									<button
										onClick={() => toggleSubcategory(`${String(main)}-${sub.key}`)}
										className="flex items-center gap-2 w-full text-md font-semibold mb-2 hover:opacity-80 transition-opacity border-b-1 border-gray-700"
									>
										<span>{sub.label}</span>
										<span className="bg-gray-600 font-light text-xs text-white px-1 py-0.5 rounded-md flex items-center justify-center">{sub.products.length} Productos</span>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											className={`w-5 h-5 fill-current transition-transform ${isExpanded ? 'rotate-180' : ''}`}
										>
											<path d="M7 10l5 5 5-5z" />
										</svg>
									</button>

									{isExpanded && (
										<div className={`${showList === "list" ? "flex flex-wrap gap-4" : "grid grid-cols-2 gap-2"}`}>
											{sub.products.map((product) =>
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
									)}
								</section>
							);
						})}
					</div>
				))}
			</div>

			<div ref={loadMoreRef} className="h-10" />
		</>
	);
};

export default ProductList;
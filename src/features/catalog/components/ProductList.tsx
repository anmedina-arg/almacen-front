'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import type { Product } from '../types';
import { CatalogCard } from './CatalogCard';

interface ProductListProps {
	products: Product[];
	mainCategories?: string[];
	searchQuery?: string;
}

/**
 * Componente de lista de productos
 */
export function ProductList({ products, mainCategories, searchQuery }: ProductListProps) {
	const [visibleProducts, setVisibleProducts] = useState(10);
	const [showList, setShowList] = useState<string>('list');
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

		return mainCategories
			.map((displayCat) => {
				// Agrupar por categoría: nuevo sistema (category_name) con fallback a mainCategory legacy
				const catProducts = products.filter(
					(p) => (p.category_name ?? String(p.mainCategory)) === displayCat
				);

				const subMap = new Map<string, Product[]>();
				catProducts.forEach((p) => {
					// Sub-agrupación: subcategory_name → categories (texto) → 'General'
					const subLabel = p.subcategory_name
						?? (p.categories?.trim() || null)
						?? 'General';
					if (!subMap.has(subLabel)) subMap.set(subLabel, []);
					subMap.get(subLabel)!.push(p);
				});

				const subcategories = Array.from(subMap.entries()).map(([label, items]) => ({
					key: label.toLowerCase(),
					label,
					products: [...items].sort((a, b) => {
						if (a.is_top_seller && !b.is_top_seller) return -1;
						if (!a.is_top_seller && b.is_top_seller) return 1;
						return 0;
					}),
				}));

				return { main: displayCat, subcategories };
			})
			.filter(({ subcategories }) => subcategories.length > 0);
	}, [products, mainCategories]);

	const [fixHeight, setFixHeight] = useState(false);

	useEffect(() => {
		if (typeof window !== 'undefined' &&
			window.scrollY > 50 &&
			Boolean(searchQuery)) {
			setFixHeight(true);
		}

		return () => { setFixHeight(false); };
	}, [searchQuery]);

	// Suppress unused variable warning — visibleProducts is used for future pagination
	void visibleProducts;

	return (
		<div className="flex flex-col items-center justify-center gap-4 sm:p-2">
			<div className='flex items-center gap-2 px-4 py-1 backdrop-blur-md bg-white/10 rounded-tl-none rounded-tr-none rounded-bl-2xl rounded-br-2xl'>
				<span className="text-xs text-gray-700">Vista:</span>
				<button
					onClick={() => setShowList('list')}
					aria-label="Vista lista"
					className={`flex items-center justify-center gap-1 border-1 rounded-md px-0.5 py-0.5 transition-colors bg-transparent text-gray-700 ${showList === 'list'
						? ' border-gray-500'
						: ' border-transparent'
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
					onClick={() => setShowList('grid')}
					aria-label="Vista grilla"
					className={`flex items-center justify-center gap-1 border-1 rounded-md px-0.5 py-0.5 transition-colors bg-transparent text-gray-700 ${showList === 'grid'
						? '  border-gray-500'
						: '  border-transparent'
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
						data-category={String(main)}
						className="w-full scroll-mt-56"
					>
						<div className='flex gap-2 items-baseline'>
							<span className="text-lg font-bold mb-2 capitalize">{String(main)}</span>
							<span className=" font-light text-xs px-1 py-0.5 rounded-md flex items-center justify-center h-auto">({subcategories.length} Categorias)</span>
						</div>

						{subcategories.map((sub) => {
							return (
								<section
								key={`${String(main)}-${sub.key}`}
								id={`${String(main).charAt(0).toUpperCase() + String(main).slice(1)}-${sub.key}`}
								data-category={String(main)}
								data-subcategory={sub.label}
								className="mb-4 scroll-mt-56"
							>
									<div className="flex items-center gap-2 w-full text-md font-semibold mb-2 border-b-1 border-gray-700">
										<span>{sub.label}</span>
										<span className="bg-gray-600 font-light text-xs text-white px-1 py-0.5 rounded-md flex items-center justify-center">{sub.products.length} Productos</span>
									</div>

									<div className={`${showList === 'list' ? 'flex flex-wrap gap-4' : 'grid grid-cols-2 gap-2'}`}>
										{sub.products.map((product) => (
											<CatalogCard
												key={`${product.id}-${product.name}`}
												product={product}
												view={showList === 'list' ? 'list' : 'grid'}
											/>
										))}
									</div>
								</section>
							);
						})}
					</div>
				))}
			</div>

			<div ref={loadMoreRef} className="h-10" />
		</div>
	);
}

export default ProductList;

'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Product } from '../types';
import { CatalogCard } from './CatalogCard';
import { useCatalogViewStore } from '../stores/catalogViewStore';

interface ProductListProps {
	products: Product[];
	mainCategories?: string[];
	searchQuery?: string;
}

/**
 * Componente de lista de productos
 */
export function ProductList({ products, mainCategories, searchQuery }: ProductListProps) {
	const { view: showList } = useCatalogViewStore();

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

	// Notifica a useScrollSpy que las secciones ya están en el DOM.
	// Necesario porque ProductList está dentro de Suspense y puede montar
	// después de que FilterButtons haya corrido su useEffect.
	useEffect(() => {
		window.dispatchEvent(new CustomEvent('catalog:sections-ready'));
	}, []);

	useEffect(() => {
		if (typeof window !== 'undefined' &&
			window.scrollY > 50 &&
			Boolean(searchQuery)) {
			setFixHeight(true);
		}

		return () => { setFixHeight(false); };
	}, [searchQuery]);

	return (
		<div className="flex flex-col items-center justify-center gap-4 sm:p-2">
			<div className={`flex flex-col gap-4 ${fixHeight ? 'mt-48' : ''}`}>
				{(() => {
					// Only the first 2 rendered products get priority={true} to fix LCP.
					// This removes loading="lazy" and adds fetchpriority="high" on above-the-fold images.
					let priorityRemaining = 2;
					return grouped.map(({ main, subcategories }) => (
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
											{sub.products.map((product) => {
												const isPriority = priorityRemaining > 0;
												if (isPriority) priorityRemaining--;
												return (
													<CatalogCard
														key={`${product.id}-${product.name}`}
														product={product}
														view={showList === 'list' ? 'list' : 'grid'}
														priority={isPriority}
													/>
												);
											})}
										</div>
									</section>
								);
							})}
						</div>
					));
				})()}
			</div>
		</div>
	);
}

export default ProductList;

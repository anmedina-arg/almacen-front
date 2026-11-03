'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Product } from '../types';
import { CatalogCard } from './CatalogCard';
import { useCatalogViewStore } from '../stores/catalogViewStore';
import { sortCatalogProducts } from '../utils/sortCatalogProducts';
import {
	formatCategoryCount,
	formatProductCount,
	hasSingleSameNameSubcategory,
} from '../utils/sectionTitles';

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
				// Agrupar por category_name (FK a categories). Un producto sin
				// category_id no cae en ninguna sección — por eso #66 la hizo
				// requerida al crear. El fallback a main_category legacy se retiró
				// en #133.
				const catProducts = products.filter((p) => p.category_name === displayCat);

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
					products: sortCatalogProducts(items),
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

	// El margen de desplazamiento de cada sección es la altura real de la zona
	// fija (la publica StickyCatalogZone en --catalog-sticky-h) más 12 px. El 12rem
	// es solo el valor de respaldo hasta que la zona publique su altura.
	return (
		<div className="flex flex-col items-center justify-center gap-4 sm:p-2">
			<div className={`flex flex-col gap-4 ${fixHeight ? 'mt-48' : ''}`}>
				{(() => {
					// Only the first 2 rendered products get priority={true} to fix LCP.
					// This removes loading="lazy" and adds fetchpriority="high" on above-the-fold images.
					let priorityRemaining = 2;
					return grouped.map(({ main, subcategories }) => {
						// Categoría con una sola subcategoría del mismo nombre: un solo título (#174).
						const hasSingleTitle = hasSingleSameNameSubcategory(
							String(main),
							subcategories.map((sub) => sub.label)
						);
						return (
							<div
								key={String(main)}
								id={String(main).charAt(0).toUpperCase() + String(main).slice(1)}
								data-category={String(main)}
								className="w-full scroll-mt-[calc(var(--catalog-sticky-h,12rem)_+_0.75rem)]"
							>
								<div className="flex items-baseline justify-between gap-2 mb-2">
									<span className="text-lg font-bold capitalize">{String(main)}</span>
									<span className="text-sm text-gray-500">
										{hasSingleTitle
											? formatProductCount(subcategories[0].products.length)
											: formatCategoryCount(subcategories.length)}
									</span>
								</div>

								{subcategories.map((sub) => {
									return (
										<section
										key={`${String(main)}-${sub.key}`}
										id={`${String(main).charAt(0).toUpperCase() + String(main).slice(1)}-${sub.key}`}
										data-category={String(main)}
										data-subcategory={sub.label}
										className="mb-4 scroll-mt-[calc(var(--catalog-sticky-h,12rem)_+_0.75rem)]"
									>
											{!hasSingleTitle && (
												<div className="flex items-center gap-2 w-full text-md font-semibold mb-2 border-b-1 border-gray-700">
													<span>{sub.label}</span>
													<span className="bg-gray-600 font-light text-xs text-white px-1 py-0.5 rounded-md flex items-center justify-center">{formatProductCount(sub.products.length)}</span>
												</div>
											)}

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
						);
					});
				})()}
			</div>
		</div>
	);
}

export default ProductList;

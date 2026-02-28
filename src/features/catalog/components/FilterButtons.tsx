'use client';

import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SubcategoryPublic {
	id: number;
	name: string;
}

interface CategoryWithSubsPublic {
	id: number;
	name: string;
	image_url?: string | null;
	subcategories: SubcategoryPublic[];
}

interface ChipsProps {
	to: string;
	label: string;
	imageUrl?: string | null;
	active?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────


/**
 * rootMargin crea una línea de disparo al 40% desde el top del viewport.
 * Una sección es "activa" cuando su top cruza esa línea.
 * El 40% refleja que los FilterButtons + buscador ocupan ~35-40% del viewport,
 * de modo que la sección detectada ya es visible para el usuario.
 */
const SPY_ROOT_MARGIN = '-40% 0px -60% 0px';
const SCROLL_DEBOUNCE_MS = 150;

/**
 * Selectores de las secciones del catálogo.
 * Usamos section y div para excluir los <a> de los propios badges del FilterButtons,
 * que también tienen data-category y data-subcategory.
 */
const SPY_SELECTOR = 'section[data-category], div[data-category]';

// ─── Chips ────────────────────────────────────────────────────────────────────

const Chips = forwardRef<HTMLAnchorElement, ChipsProps>(function Chips(
	{ to, label, imageUrl, active = false },
	ref,
) {
	return (
		<Link
			ref={ref}
			href={to}
			className={`font-medium py-0.5 px-1 rounded-xl flex flex-col items-center justify-center gap-1 w-24 shrink-0 transition-colors ${
				active ? 'bg-gray-700' : ''
			}`}
		>
			<div
				className={`relative w-full h-16 rounded-xl overflow-hidden transition-colors ${
					active ? 'bg-gray-600' : 'bg-gray-200'
				}`}
			>
				{imageUrl && (
					<Image
						src={imageUrl}
						alt={label}
						fill
						className="object-cover"
						sizes="96px"
					/>
				)}
			</div>
			<span className={`text-sm capitalize transition-colors ${active ? 'text-gray-100' : ''}`}>
				{label}
			</span>
		</Link>
	);
});

// ─── FilterButtons ────────────────────────────────────────────────────────────

export function FilterButtons() {
	const { data: categories = [] } = useQuery<CategoryWithSubsPublic[]>({
		queryKey: ['categories-public-with-subs'],
		queryFn: () => fetch('/api/categories?include=subcategories').then((r) => r.json()),
		staleTime: 1000 * 60 * 10,
	});

	// Estado activo (lowercase para comparación case-insensitive)
	const [activeCatName, setActiveCatName] = useState<string | null>(null);
	const [activeSubName, setActiveSubName] = useState<string | null>(null);

	// Refs de filas
	const chipRowRef = useRef<HTMLDivElement>(null);
	const subRowRef = useRef<HTMLDivElement>(null);

	// Mapas de refs a elementos del DOM para auto-scroll
	const chipRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
	const badgeRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());

	// Refs de observadores y estado interno
	const ioRef = useRef<IntersectionObserver | null>(null);
	const observedRef = useRef<Set<Element>>(new Set());
	const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	/**
	 * Cuando el scroll horizontal del row de badges cambia el estado,
	 * no queremos que el efecto de auto-scroll vuelva a mover ese row
	 * (el usuario lo está controlando manualmente).
	 */
	const skipBadgeAutoScrollRef = useRef(false);

	// ── Helpers de auto-scroll ────────────────────────────────────────────────

	const scrollChipIntoView = useCallback((catName: string | null) => {
		if (!catName) return;
		chipRefs.current.get(catName.toLowerCase())?.scrollIntoView({
			behavior: 'smooth',
			block: 'nearest',
			inline: 'center',
		});
	}, []);

	const scrollBadgeIntoView = useCallback((subName: string | null) => {
		if (!subName) return;
		badgeRefs.current.get(subName.toLowerCase())?.scrollIntoView({
			behavior: 'smooth',
			block: 'nearest',
			inline: 'center',
		});
	}, []);

	// ── Registrar sección en el IntersectionObserver (idempotente) ───────────

	const observeSection = useCallback((el: Element) => {
		if (observedRef.current.has(el)) return;
		observedRef.current.add(el);
		ioRef.current?.observe(el);
	}, []);

	// ── IntersectionObserver + MutationObserver ───────────────────────────────

	useEffect(() => {
		const io = new IntersectionObserver(
			(entries) => {
				const hitting = entries.filter((e) => e.isIntersecting);
				if (hitting.length === 0) return;

				/**
				 * Prioridad: secciones de subcategoría (section[data-subcategory])
				 * sobre secciones de categoría (div[data-category], sin data-subcategory).
				 * Esto evita que el div contenedor (que abarca toda la categoría)
				 * tape a la subcategoría activa cuando ambos intersectan.
				 */
				const subHits = hitting.filter((e) => e.target.hasAttribute('data-subcategory'));
				const source = subHits.length > 0 ? subHits : hitting;

				// De los candidatos, tomar el que esté más arriba en el viewport
				const top = source.reduce((a, b) =>
					a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
				);

				const cat = top.target.getAttribute('data-category');
				const sub = top.target.getAttribute('data-subcategory') ?? null;
				if (!cat) return;

				setActiveCatName(cat.toLowerCase());
				setActiveSubName(sub ? sub.toLowerCase() : null);
			},
			{ rootMargin: SPY_ROOT_MARGIN },
		);

		ioRef.current = io;

		// Observar secciones ya presentes en el DOM
		document.querySelectorAll(SPY_SELECTOR).forEach(observeSection);

		// Observar secciones que se agreguen después (carga async del catálogo)
		const mo = new MutationObserver(() => {
			document.querySelectorAll(SPY_SELECTOR).forEach(observeSection);
		});
		mo.observe(document.body, { childList: true, subtree: true });

		// Capturar ref en variable local para el cleanup (react-hooks/exhaustive-deps)
		const observedSet = observedRef.current;
		return () => {
			io.disconnect();
			mo.disconnect();
			observedSet.clear();
		};
	}, [observeSection]);

	// ── Auto-scroll cuando cambia la categoría activa ────────────────────────

	useEffect(() => {
		scrollChipIntoView(activeCatName);
	}, [activeCatName, scrollChipIntoView]);

	// ── Auto-scroll cuando cambia la subcategoría activa ────────────────────
	// (salvo que el cambio venga del scroll horizontal, donde el usuario
	//  controla ese row manualmente)

	useEffect(() => {
		if (skipBadgeAutoScrollRef.current) {
			skipBadgeAutoScrollRef.current = false;
			return;
		}
		scrollBadgeIntoView(activeSubName);
	}, [activeSubName, scrollBadgeIntoView]);

	// ── Scroll horizontal en la fila de badges ────────────────────────────────

	const handleSubRowScroll = useCallback(() => {
		if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);

		scrollDebounceRef.current = setTimeout(() => {
			const rowEl = subRowRef.current;
			if (!rowEl) return;

			// Centro visible del row
			const rowRect = rowEl.getBoundingClientRect();
			const centerX = rowRect.left + rowRect.width / 2;

			// Badge cuyo centro está más cerca del centro del row
			let closestBadge: HTMLElement | null = null;
			let minDistance = Infinity;

			rowEl.querySelectorAll<HTMLElement>('[data-subcategory]').forEach((badge) => {
				const rect = badge.getBoundingClientRect();
				const badgeCenterX = rect.left + rect.width / 2;
				const dist = Math.abs(badgeCenterX - centerX);
				if (dist < minDistance) {
					minDistance = dist;
					closestBadge = badge;
				}
			});

			if (!closestBadge) return;

			const cat = (closestBadge as HTMLElement).dataset.category ?? null;
			const sub = (closestBadge as HTMLElement).dataset.subcategory ?? null;

			// Inhibir auto-scroll del badge row (el usuario lo controla)
			skipBadgeAutoScrollRef.current = true;
			setActiveCatName(cat ? cat.toLowerCase() : null);
			setActiveSubName(sub ? sub.toLowerCase() : null);

			// Sí mover el chip row para reflejar la nueva categoría activa
			if (cat) scrollChipIntoView(cat);
		}, SCROLL_DEBOUNCE_MS);
	}, [scrollChipIntoView]);

	// ── Datos ─────────────────────────────────────────────────────────────────

	const allSubs = categories.flatMap((cat) =>
		cat.subcategories.map((sub) => ({
			id: sub.id,
			name: sub.name,
			categoryName: cat.name,
			anchor: `#${cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}-${sub.name.toLowerCase()}`,
		})),
	);

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<div className="flex flex-col">
			{/* Fila 1: chips de categoría */}
			<div ref={chipRowRef} className="flex gap-2 py-1 overflow-x-auto">
				{categories.map((cat) => {
					const anchor = `#${cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}`;
					const isActive = activeCatName === cat.name.toLowerCase();
					return (
						<Chips
							key={cat.id}
							ref={(el) => {
								if (el) chipRefs.current.set(cat.name.toLowerCase(), el);
								else chipRefs.current.delete(cat.name.toLowerCase());
							}}
							to={anchor}
							label={cat.name}
							imageUrl={cat.image_url}
							active={isActive}
						/>
					);
				})}
			</div>

			{/* Fila 2: badges de subcategoría */}
			<div
				ref={subRowRef}
				className="flex gap-1.5 py-1.5 overflow-x-auto"
				onScroll={handleSubRowScroll}
			>
				{allSubs.map((sub) => {
					const isActive = activeSubName === sub.name.toLowerCase();
					return (
						<Link
							key={sub.id}
							ref={(el) => {
								if (el) badgeRefs.current.set(sub.name.toLowerCase(), el);
								else badgeRefs.current.delete(sub.name.toLowerCase());
							}}
							href={sub.anchor}
							data-category={sub.categoryName}
							data-subcategory={sub.name}
							className={`shrink-0 px-2.5 py-0.5 border rounded-full text-xs transition-colors whitespace-nowrap ${
								isActive
									? 'bg-gray-700 border-gray-700 text-gray-100'
									: 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
							}`}
						>
							{sub.name}
						</Link>
					);
				})}
			</div>
		</div>
	);
}

export default FilterButtons;

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Product } from '../types';
import { useCart } from '../hooks/useCart';
import { generateWhatsAppMessage, openWhatsApp } from '../utils/messageUtils';
import { calculateItemPrice } from '../utils/productUtils';
import { ProductList } from './ProductList';
import { WhatsAppButton } from './WhatsAppButton';
import { ConfirmationModal } from './ConfirmationModal';
import { InfoBanner } from './InfoBanner';
import { useProducts } from '@/hooks/useProducts';
import { orderService } from '@/features/admin/services/orderService';
import { normalize } from '@/utils/normalize';

/**
 * Contenedor que maneja toda la lógica del carrito y la interfaz de usuario
 */
export function ProductListContainer() {
	const { data: products = [], isLoading, refetch } = useProducts();

	// API ya filtra solo activos cuando includeInactive no está presente
	const activeProductsAll: Product[] = products;

	// Search + debounce
	const [search, setSearch] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');

	useEffect(() => {
		const handler = setTimeout(() => setDebouncedSearch(search.trim()), 300);
		return () => clearTimeout(handler);
	}, [search]);

	// Filtrar productos usando el término debounced (insensible a mayúsculas, tildes y especiales)
	const activeProducts = useMemo(() => {
		const q = normalize(debouncedSearch);
		if (!q) return activeProductsAll;
		return activeProductsAll.filter((p) => normalize(p.name).includes(q));
	}, [activeProductsAll, debouncedSearch]);

	// Obtener todas las categorías únicas para mostrar (nuevo sistema con fallback al legado)
	const displayCategories = useMemo(() => {
		const cats = activeProducts.map((p) => p.category_name ?? String(p.mainCategory));
		return Array.from(new Set(cats)).filter(Boolean);
	}, [activeProducts]);

	const { state, addToCart, removeFromCart, clearCart } = useCart();
	const [showConfirmation, setShowConfirmation] = useState(false);

	// Memoizar el mensaje de WhatsApp
	const whatsAppMessage = useMemo(() => {
		return generateWhatsAppMessage(state.items);
	}, [state.items]);

	// Función para manejar el envío del mensaje
	const handleSendMessage = () => {
		if (state.items.length === 0) {
			// Si no hay productos, enviar mensaje simple
			openWhatsApp('Hola! Quiero hacerte un pedido');
		} else {
			// Si hay productos, mostrar confirmación
			setShowConfirmation(true);
		}
	};

	// Función para confirmar y enviar pedido
	const handleConfirmOrder = () => {
		// CRITICAL for iOS Safari: Open WhatsApp FIRST (synchronously), then create order in background.
		// iOS Safari blocks window.open() if there is ANY async operation before it.

		// 1. Open WhatsApp immediately (synchronous — required for iOS)
		openWhatsApp(whatsAppMessage);

		// 2. Close modal and clear cart immediately
		setShowConfirmation(false);
		clearCart();

		// 3. Create order in background (fire-and-forget)
		// Happens after WhatsApp opens so it never blocks the redirect.
		orderService
			.createOrder({
				whatsapp_message: whatsAppMessage,
				items: state.items.map((item) => ({
					product_id: item.id,
					product_name: item.name,
					quantity: item.quantity,
					// Normalize to price-per-base-unit so the DB formula
					// (quantity × unit_price) produces the correct subtotal.
					// calculateItemPrice already applies the sale_type conversion
					// (÷1000 for kg, ÷100 for 100gr, ×1 for unit).
					unit_price: item.quantity > 0
						? calculateItemPrice(item) / item.quantity
						: item.unitPrice,
					is_by_weight: item.isByWeight,
				})),
			})
			.then(() => {
				// Refresh stock silently after order is confirmed
				refetch();
			})
			.catch((error) => {
				console.error('Error creating order in background:', error);
				// WhatsApp is already open — no user-facing error shown
			});
	};

	// Función para cancelar confirmación
	const handleCancelOrder = () => {
		setShowConfirmation(false);
	};

	const productsById = useMemo(() => {
		return new Map(products.map(p => [p.id, p]));
	}, [products]);

	const onAdd = useCallback((id: number) => {
		const product = productsById.get(id);
		if (product) addToCart(product);
	}, [addToCart, productsById]);

	const onRemove = useCallback((id: number) => {
		const product = productsById.get(id);
		if (product) removeFromCart(product);
	}, [removeFromCart, productsById]);

	// Map estable: solo cambia cuando el carrito cambia, no mezcla datos del catálogo
	const cartQuantities = useMemo(
		() => new Map(state.items.map(item => [item.id, item.quantity])),
		[state.items]
	);

	if (isLoading) {
		return (
			<div className="w-full p-4 text-center text-sm text-gray-500">
				Cargando productos...
			</div>
		);
	}

	return (
		<>
			{/* Banner informativo cuando no hay productos */}
			{state.items.length === 0 && <InfoBanner />}

			{/* Buscador */}
			<div className="w-full flex justify-center px-4 py-2 sticky top-52 z-30 bg-white/80 backdrop-blur-md transition-all duration-300">
				<input
					type="search"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Buscar producto por nombre..."
					className="w-full max-w-lg bg-white/5 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
					aria-label="Buscar productos"
				/>
			</div>

			{/* Lista de productos (recibe los productos filtrados y sus mainCategories) */}
			{activeProducts.length === 0 ? (
				<div className="w-full max-w-xl mx-auto p-4 text-center text-sm text-gray-700 bg-orange-400 rounded-md">
					<p>
						no hemos encontrado el producto, por favor contactate con Andrés o Maria. Gracias. Andrés: +5493816713512
					</p>
				</div>
			) : (
				<ProductList
					products={activeProducts}
					cartQuantities={cartQuantities}
					onAdd={onAdd}
					onRemove={onRemove}
					mainCategories={displayCategories}
					searchQuery={debouncedSearch}
				/>
			)}

			{/* Botón flotante de WhatsApp */}
			<WhatsAppButton
				cartItems={state.items}
				onSendMessage={handleSendMessage}
			/>

			{/* Modal de confirmación */}
			<ConfirmationModal
				isOpen={showConfirmation}
				message={whatsAppMessage}
				onConfirm={handleConfirmOrder}
				onCancel={handleCancelOrder}
			/>
		</>
	);
}

export default ProductListContainer;

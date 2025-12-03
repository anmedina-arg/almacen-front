'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { products } from "../app/mockdata";
import { Product } from '@/types';
import { useCart } from '@/hooks/useCart';
import { generateWhatsAppMessage, openWhatsApp } from '@/utils/messageUtils';
import ProductList from './ProductList';
import WhatsAppButton from './WhatsAppButton';
import ConfirmationModal from './ConfirmationModal';
import InfoBanner from './InfoBanner';

/**
 * Contenedor que maneja toda la lógica del carrito y la interfaz de usuario
 */
const ProductListContainer: React.FC = () => {

	// Filtrar productos activos (sin search)
	const activeProductsAll: Product[] = products.filter((product) => product.active);

	// Search + debounce
	const [search, setSearch] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');

	useEffect(() => {
		const handler = setTimeout(() => setDebouncedSearch(search.trim()), 300);
		return () => clearTimeout(handler);
	}, [search]);

	// Normalizador: quita tildes/diacríticos, lower-case y caracteres no alfanuméricos
	const normalize = (s?: string) =>
		(s ?? '')
			.toString()
			.toLowerCase()
			.normalize('NFD')                       // descompone caracteres acentuados
			.replace(/[\u0300-\u036f]/g, '')       // elimina marcas diacríticas
			.replace(/[^a-z0-9\s]/g, '')           // elimina caracteres especiales
			.trim();

	// Filtrar productos usando el término debounced (insensible a mayúsculas, tildes y especiales)
	const activeProducts = useMemo(() => {
		const q = normalize(debouncedSearch);
		if (!q) return activeProductsAll;
		return activeProductsAll.filter((p) => normalize(p.name).includes(q));
	}, [activeProductsAll, debouncedSearch]);

	// Obtener todas las categorías únicas (ignorando vacías) a partir de los productos filtrados
	const mainCategories = useMemo(() => {
		return Array.from(new Set(activeProducts.map((p) => p.mainCategory).filter((cat) => cat)));
	}, [activeProducts]);

	const { state, addToCart, removeFromCart, getItemQuantity } = useCart();
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
		openWhatsApp(whatsAppMessage);
		setShowConfirmation(false);
	};

	// Función para cancelar confirmación
	const handleCancelOrder = () => {
		setShowConfirmation(false);
	};

	// Crear productos con sus cantidades y funciones (a partir de activeProducts filtrados)
	const productsWithHandlers = useMemo(() => {
		return activeProducts.map(product => ({
			...product,
			quantity: getItemQuantity(product.id),
			onAdd: () => addToCart(product),
			onRemove: () => removeFromCart(product),
		}));
	}, [activeProducts, getItemQuantity, addToCart, removeFromCart]);

	return (
		<>
			{/* Banner informativo cuando no hay productos */}
			{state.items.length === 0 && <InfoBanner />}

			{/* Buscador */}
			<div className="w-full flex justify-center px-4 py-2 sticky top-42 z-30 bg-white/80 backdrop-blur-md transition-all duration-300">
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
			{productsWithHandlers.length === 0 ? (
				<div className="w-full max-w-xl mx-auto p-4 text-center text-sm text-gray-700 bg-orange-400 rounded-md">
					<p>
						no hemos encontrado el producto, por favor contactate con Andrés o Maria. Gracias. Andrés: +5493816713512
					</p>
				</div>
			) : (
				<ProductList
					products={productsWithHandlers}
					mainCategories={mainCategories}
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
};

export default ProductListContainer;
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product } from '@/types';
import { useCart } from '@/hooks/useCart';
import { generateWhatsAppMessage, openWhatsApp } from '@/utils/messageUtils';
import ProductList from './ProductList';
import WhatsAppButton from './WhatsAppButton';
import ConfirmationModal from './ConfirmationModal';
import InfoBanner from './InfoBanner';
import { useProducts } from '@/hooks/useProducts';
import { orderService } from '@/features/admin/services/orderService';

/**
 * Contenedor que maneja toda la lógica del carrito y la interfaz de usuario
 */
const ProductListContainer: React.FC = () => {

	const { products, isLoading } = useProducts();

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

	const { state, addToCart, removeFromCart, clearCart, getItemQuantity } = useCart();
	const [showConfirmation, setShowConfirmation] = useState(false);
	const [isCreatingOrder, setIsCreatingOrder] = useState(false);
	const [orderError, setOrderError] = useState<string | null>(null);

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
	const handleConfirmOrder = async () => {
		setIsCreatingOrder(true);
		setOrderError(null);

		try {
			// 1. Create order in the database
			await orderService.createOrder({
				whatsapp_message: whatsAppMessage,
				items: state.items.map((item) => ({
					product_id: item.id,
					product_name: item.name,
					quantity: item.quantity,
					unit_price: item.unitPrice,
					is_by_weight: item.isByWeight,
				})),
			});

			// 2. Open WhatsApp with the message
			openWhatsApp(whatsAppMessage);

			// 3. Clear the cart
			clearCart();

			// 4. Close the modal
			setShowConfirmation(false);
		} catch (error) {
			console.error('Error creating order:', error);
			setOrderError(
				error instanceof Error
					? error.message
					: 'Error al crear el pedido. Se abrira WhatsApp de todas formas.'
			);

			// Still open WhatsApp even if order creation fails
			openWhatsApp(whatsAppMessage);
			setShowConfirmation(false);
		} finally {
			setIsCreatingOrder(false);
		}
	};

	// Función para cancelar confirmación
	const handleCancelOrder = () => {
		setShowConfirmation(false);
	};

	// Crear productos con sus cantidades y funciones (a partir de activeProducts filtrados)

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

	const productsWithQuantity = useMemo(() => {
		return activeProducts.map(product => ({
			...product,
			quantity: getItemQuantity(product.id),
			// onAdd: () => addToCart(product),
			// onRemove: () => removeFromCart(product),
		}));
	}, [activeProducts, getItemQuantity, addToCart, removeFromCart]);

	console.count('ProductListContainer render');


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
			{activeProducts.length === 0 ? (
				<div className="w-full max-w-xl mx-auto p-4 text-center text-sm text-gray-700 bg-orange-400 rounded-md">
					<p>
						no hemos encontrado el producto, por favor contactate con Andrés o Maria. Gracias. Andrés: +5493816713512
					</p>
				</div>
			) : (
				<ProductList
					products={productsWithQuantity}
					onAdd={onAdd}
					onRemove={onRemove}
					mainCategories={mainCategories}
					searchQuery={debouncedSearch}
				/>
			)}

			{/* Botón flotante de WhatsApp */}
			<WhatsAppButton
				cartItems={state.items}
				onSendMessage={handleSendMessage}
			/>

			{/* Error toast */}
			{orderError && (
				<div className="fixed top-4 right-4 z-50 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg max-w-sm">
					<div className="flex items-start gap-2">
						<p className="text-sm">{orderError}</p>
						<button
							onClick={() => setOrderError(null)}
							className="text-red-600 hover:text-red-800 font-bold text-lg leading-none"
						>
							x
						</button>
					</div>
				</div>
			)}

			{/* Modal de confirmación */}
			<ConfirmationModal
				isOpen={showConfirmation}
				message={whatsAppMessage}
				onConfirm={handleConfirmOrder}
				onCancel={handleCancelOrder}
				isLoading={isCreatingOrder}
			/>
		</>
	);
};

export default ProductListContainer;
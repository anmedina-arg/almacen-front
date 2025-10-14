'use client';

import React, { useState, useMemo } from 'react';
import { Product } from '@/types';
import { useCart } from '@/hooks/useCart';
import { useProducts, useCategories } from '@/hooks/useApi';
import { generateWhatsAppMessage, openWhatsApp } from '@/utils/messageUtils';
import ProductList from './ProductList';
import WhatsAppButton from './WhatsAppButton';
import ConfirmationModal from './ConfirmationModal';
import InfoBanner from './InfoBanner';

// interface ProductListContainerProps {
// 	products: Product[];
// 	categories: string[];
// }

/**
 * Contenedor que maneja toda la lógica del carrito y la interfaz de usuario
 */
const ProductListContainer: React.FC = () => {
	// Obtener productos y categorías desde la API
	const { products: activeProducts, loading: productsLoading, error: productsError } = useProducts({ active: true });
	const { categories, loading: categoriesLoading, error: categoriesError } = useCategories();

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

	// Crear productos con sus cantidades y funciones
	const productsWithHandlers = useMemo(() => {
		return activeProducts.map(product => ({
			...product,
			quantity: getItemQuantity(product.id),
			onAdd: () => addToCart(product),
			onRemove: () => removeFromCart(product),
		}));
	}, [activeProducts, getItemQuantity, addToCart, removeFromCart]);

	// Mostrar loading o error si es necesario
	if (productsLoading || categoriesLoading) {
		return (
			<div className="flex justify-center items-center py-8">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
				<span className="ml-2">Cargando productos...</span>
			</div>
		);
	}

	if (productsError || categoriesError) {
		return (
			<div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
				<p className="text-red-600">
					Error al cargar los productos: {productsError || categoriesError}
				</p>
				<button
					onClick={() => window.location.reload()}
					className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
				>
					Reintentar
				</button>
			</div>
		);
	}

	return (
		<>
			{/* Banner informativo cuando no hay productos */}
			{state.items.length === 0 && <InfoBanner />}

			{/* Lista de productos */}
			<ProductList
				products={productsWithHandlers}
				categories={categories}
			/>

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
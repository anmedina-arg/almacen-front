'use client';

import React, { useState, useMemo } from 'react';
import { Product } from '@/types';
import { useCart } from '@/hooks/useCart';
import { generateWhatsAppMessage, openWhatsApp } from '@/utils/messageUtils';
import ProductList from './ProductList';
import WhatsAppButton from './WhatsAppButton';
import ConfirmationModal from './ConfirmationModal';
import InfoBanner from './InfoBanner';

interface ProductListContainerProps {
	products: Product[];
	categories: string[];
}

/**
 * Contenedor que maneja toda la lógica del carrito y la interfaz de usuario
 */
const ProductListContainer: React.FC<ProductListContainerProps> = ({
	products,
	categories
}) => {
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
		return products.map(product => ({
			...product,
			quantity: getItemQuantity(product.id),
			onAdd: () => addToCart(product),
			onRemove: () => removeFromCart(product),
		}));
	}, [products, getItemQuantity, addToCart, removeFromCart]);

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
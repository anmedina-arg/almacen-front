'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { CartItem } from '../types';
import { generateWhatsAppMessage, openWhatsApp } from '../utils/messageUtils';
import { calculateItemPrice } from '../utils/productUtils';
import { orderService } from '@/features/admin/services/orderService';

export function useOrderSubmit(cartItems: CartItem[]) {
  const router = useRouter();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const whatsAppMessage = useMemo(() => generateWhatsAppMessage(cartItems), [cartItems]);

  const handleSendMessage = () => {
    if (cartItems.length === 0) {
      openWhatsApp('Hola! Quiero hacerte un pedido');
    } else {
      setShowConfirmation(true);
    }
  };

  const handleConfirmOrder = (clearCart: () => void) => {
    // CRITICAL for iOS Safari: Open WhatsApp FIRST (synchronously), then create order in background.
    openWhatsApp(whatsAppMessage);

    setShowConfirmation(false);
    clearCart();

    orderService
      .createOrder({
        whatsapp_message: whatsAppMessage,
        items: cartItems.map((item) => ({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.quantity > 0
            ? calculateItemPrice(item) / item.quantity
            : item.unitPrice,
          is_by_weight: item.isByWeight,
        })),
      })
      .then(() => {
        router.refresh();
      })
      .catch((error) => {
        console.error('Error creating order in background:', error);
      });
  };

  const handleCancelOrder = () => setShowConfirmation(false);

  return { showConfirmation, whatsAppMessage, handleSendMessage, handleConfirmOrder, handleCancelOrder };
}

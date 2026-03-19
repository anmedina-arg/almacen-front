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
    // Snapshot order data before any state changes.
    const items = cartItems.map((item) => ({
      product_id: item.id,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.quantity > 0
        ? calculateItemPrice(item) / item.quantity
        : item.unitPrice,
      is_by_weight: item.isByWeight,
      from_suggestion: item.from_suggestion ?? false,
    }));
    const message = whatsAppMessage;

    // Start the fetch BEFORE opening WhatsApp so the request is already
    // in-flight when iOS switches apps. Combined with keepalive:true in the
    // service, this survives Safari being backgrounded immediately after.
    const orderPromise = orderService.createOrder({
      whatsapp_message: message,
      items,
    });

    // CRITICAL for iOS Safari: must be synchronous from the user gesture —
    // calling window.open after an await would trigger the popup blocker.
    openWhatsApp(message);

    setShowConfirmation(false);
    clearCart();

    orderPromise
      .then(() => {
        router.refresh();
      })
      .catch((error: unknown) => {
        console.error('[useOrderSubmit] Error creating order:', error instanceof Error ? error.message : error);
        console.error('[useOrderSubmit] Items sent:', JSON.stringify(items, null, 2));
      });
  };

  const handleCancelOrder = () => setShowConfirmation(false);

  return { showConfirmation, whatsAppMessage, handleSendMessage, handleConfirmOrder, handleCancelOrder };
}

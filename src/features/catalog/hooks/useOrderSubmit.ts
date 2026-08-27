'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { CartItem } from '../types';
import { generateWhatsAppMessage, openWhatsApp } from '../utils/messageUtils';
import { calculateItemPrice } from '../utils/productUtils';
import { orderService } from '@/features/admin/services/orderService';
import type { PendingSurtidoEntry } from '../stores/cartStore';

export function useOrderSubmit(
  cartItems: CartItem[],
  whatsappNumber: string,
  pendingSurtidoProducts: PendingSurtidoEntry[] = []
) {
  const router = useRouter();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const whatsAppMessage = useMemo(() => generateWhatsAppMessage(cartItems), [cartItems]);

  const handleSendMessage = () => {
    // Producto Surtido con unidades marcadas por "+" pero sin confirmar
    // Variedades: bloquea el envío en vez de mandar un pedido incompleto
    // (#94, ADR-0010).
    if (pendingSurtidoProducts.length > 0) {
      const names = pendingSurtidoProducts.map((p) => p.productName).join(', ');
      alert(`Te faltan elegir sabores para ${names}`);
      return;
    }

    if (cartItems.length === 0) {
      openWhatsApp('Hola! Quiero hacerte un pedido', whatsappNumber);
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
      // Producto Surtido (#95): viaja el array completo (incluso vacío)
      // para que el server pueda correlacionar posicionalmente contra los
      // order_items que create_order() inserta en este mismo orden.
      variedades: item.variedades,
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
    openWhatsApp(message, whatsappNumber);

    setShowConfirmation(false);

    orderPromise
      .then(() => {
        clearCart();
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

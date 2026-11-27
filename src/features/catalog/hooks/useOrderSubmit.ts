'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { CartItem } from '../types';
import { generateWhatsAppMessage, openWhatsApp } from '../utils/messageUtils';
import { createOrderSubmitGuard, SUBMIT_LOCK_TIMEOUT_MS } from '../utils/orderSubmitGuard';
import { calculateItemPrice } from '../utils/productUtils';
import { orderApiClient } from '@/features/admin/services/orderApiClient';
import type { PendingSurtidoEntry } from '../stores/cartStore';

export function useOrderSubmit(
  cartItems: CartItem[],
  whatsappNumber: string,
  pendingSurtidoProducts: PendingSurtidoEntry[] = []
) {
  const router = useRouter();
  const [showConfirmation, setShowConfirmation] = useState(false);
  // #193: true mientras un pedido está en vuelo. Solo para la UI (deshabilitar
  // botones); quien realmente impide el doble envío es el candado del guard,
  // que es síncrono y no espera a un re-render.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guard] = useState(() => createOrderSubmitGuard());

  const whatsAppMessage = useMemo(() => generateWhatsAppMessage(cartItems), [cartItems]);

  const handleSendMessage = () => {
    if (isSubmitting) return;

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
    // #193: el carrito sigue lleno hasta que el servidor responde, así que sin
    // candado se podía reenviar el mismo pedido mientras el primero viajaba.
    // La firma identifica el contenido del carrito: un reintento tras un error
    // con el mismo carrito reusa la clave de idempotencia (el servidor no crea
    // otro pedido si el primero sí llegó); si el carrito cambió, clave nueva.
    const signature = JSON.stringify(cartItems.map((item) => [item.id, item.quantity, item.variedades ?? null]));
    const attempt = guard.begin(signature);
    if (attempt === null) return;
    setIsSubmitting(true);
    // Un fetch colgado nunca llega al then/catch: sin esto el botón quedaría en
    // "Enviando..." hasta recargar. Mismo tope que el candado del guard.
    const releaseUiTimer = setTimeout(() => setIsSubmitting(false), SUBMIT_LOCK_TIMEOUT_MS);

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
    const orderPromise = orderApiClient.createOrder({
      whatsapp_message: message,
      items,
      idempotency_key: attempt.key,
    });

    // CRITICAL for iOS Safari: must be synchronous from the user gesture —
    // calling window.open after an await would trigger the popup blocker.
    openWhatsApp(message, whatsappNumber);

    setShowConfirmation(false);

    orderPromise
      .then(() => {
        clearTimeout(releaseUiTimer);
        attempt.succeeded();
        setIsSubmitting(false);
        clearCart();
        router.refresh();
      })
      .catch((error: unknown) => {
        clearTimeout(releaseUiTimer);
        attempt.failed();
        setIsSubmitting(false);
        console.error('[useOrderSubmit] Error creating order:', error instanceof Error ? error.message : error);
        console.error('[useOrderSubmit] Items sent:', JSON.stringify(items, null, 2));
      });
  };

  const handleCancelOrder = () => setShowConfirmation(false);

  return { showConfirmation, isSubmitting, whatsAppMessage, handleSendMessage, handleConfirmOrder, handleCancelOrder };
}

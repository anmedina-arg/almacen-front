'use client';

import { useCartItems, useCartStore, useUnconfirmedSurtidoProducts } from '../stores/cartStore';
import { useOrderSubmit } from '../hooks/useOrderSubmit';
import { WhatsAppButton } from './WhatsAppButton';
import { ConfirmationModal } from './ConfirmationModal';

export function OrderFlowController({ whatsappNumber }: { whatsappNumber: string }) {
  const items = useCartItems();
  const clearCart = useCartStore((s) => s.clearCart);
  const pendingSurtidoProducts = useUnconfirmedSurtidoProducts();

  const { showConfirmation, whatsAppMessage, handleSendMessage, handleConfirmOrder, handleCancelOrder } =
    useOrderSubmit(items, whatsappNumber, pendingSurtidoProducts);

  return (
    <>
      <WhatsAppButton cartItems={items} onSendMessage={handleSendMessage} />
      <ConfirmationModal
        isOpen={showConfirmation}
        message={whatsAppMessage}
        onConfirm={() => handleConfirmOrder(clearCart)}
        onCancel={handleCancelOrder}
        cartProductIds={items.map((i) => i.id)}
      />
    </>
  );
}

'use client';

import { useCartItems, useCartStore } from '../stores/cartStore';
import { useOrderSubmit } from '../hooks/useOrderSubmit';
import { WhatsAppButton } from './WhatsAppButton';
import { ConfirmationModal } from './ConfirmationModal';

export function OrderFlowController() {
  const items = useCartItems();
  const clearCart = useCartStore((s) => s.clearCart);

  const { showConfirmation, whatsAppMessage, handleSendMessage, handleConfirmOrder, handleCancelOrder } =
    useOrderSubmit(items);

  return (
    <>
      <WhatsAppButton cartItems={items} onSendMessage={handleSendMessage} />
      <ConfirmationModal
        isOpen={showConfirmation}
        message={whatsAppMessage}
        onConfirm={() => handleConfirmOrder(clearCart)}
        onCancel={handleCancelOrder}
      />
    </>
  );
}

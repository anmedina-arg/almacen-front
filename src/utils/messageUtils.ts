import { CartItem } from '@/types';
import {
  getWeightType,
  calculateItemPrice,
  truncateProductName,
} from './productUtils';

/**
 * Genera el mensaje de WhatsApp con formato optimizado
 */
export const generateWhatsAppMessage = (cartItems: CartItem[]): string => {
  if (cartItems.length === 0) {
    return 'Hola! Quiero hacerte un pedido';
  }

  // Detectar ancho de pantalla para ajustar el formato
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  // Definir anchos de columnas según el dispositivo
  const quantityWidth = 8; // Columna de cantidad
  const productWidth = isMobile ? 18 : 28; // Columna de producto
  const priceWidth = 10; // Columna de precio

  let message = 'Hola! Quiero hacerte un pedido de:\n\n';
  let total = 0;

  cartItems.forEach((item) => {
    const itemTotal = calculateItemPrice(item);
    total += itemTotal;

    const weightType = getWeightType(item.name);
    let quantityText = '';

    if (weightType === '100gr') {
      quantityText = `${item.quantity}gr`;
    } else if (weightType === 'kg') {
      if (item.quantity >= 1000) {
        quantityText = `${item.quantity / 1000}kg`;
      } else {
        quantityText = `${item.quantity}gr`;
      }
    } else {
      quantityText = `${item.quantity}`;
    }

    // Truncar nombre del producto según el ancho de la columna
    const productName = truncateProductName(item.name, productWidth);

    // Formatear cada columna con ancho fijo
    const quantityColumn = quantityText.padEnd(quantityWidth);
    const productColumn = productName.padEnd(productWidth);
    const priceColumn = `$${itemTotal}`.padStart(priceWidth);

    // Construir la línea con las tres columnas
    message += `${quantityColumn}${productColumn}${priceColumn}\n`;
  });

  message += `\nTotal = $${total}`;
  return message;
};

/**
 * Abre WhatsApp con el mensaje generado
 */
export const openWhatsApp = (message: string): void => {
  const phoneNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5491112345678';
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank');
};

import { formatQuantity } from '@/utils/formatQuantity';
import { CartItem } from '../types';
import { calculateItemPrice, truncateProductName } from './productUtils';

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

    let quantityText = '';

    quantityText = formatQuantity(item.quantity, item.saleType);

    // Truncar nombre del producto según el ancho de la columna
    const productName = truncateProductName(item.name, productWidth);

    // Formatear cada columna con ancho fijo
    const quantityColumn = quantityText.padEnd(quantityWidth);
    const productColumn = productName.padEnd(productWidth);
    const priceColumn = `$${itemTotal}`.padStart(priceWidth);

    // Construir la línea con las tres columnas
    message += `${quantityColumn}${productColumn}${priceColumn}\n`;

    // Producto Surtido (#94): mostrar qué Variedades eligió para esta línea.
    if (item.variedades && item.variedades.length > 0) {
      message += `   ${item.variedades.map((v) => v.name).join(', ')}\n`;
    }
  });

  message += `\nTotal = $${total}`;
  return message;
};

/**
 * Abre WhatsApp con el mensaje generado, al número ya resuelto por el
 * caller (ver resolveWhatsappNumber.ts) — no lee env vars acá porque este
 * número ahora depende de la Store activa, resuelta server-side.
 */
export const openWhatsApp = (message: string, phoneNumber: string): void => {
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  window.open(whatsappUrl, '_blank');
};

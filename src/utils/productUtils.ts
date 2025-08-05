import { Product, CartItem, WeightType } from '@/types';

/**
 * Detecta si un producto se vende por peso
 */
export const isProductByWeight = (productName: string): boolean => {
  const name = productName.toLowerCase();
  return name.includes('x 100 gr') || name.includes('x kg');
};

/**
 * Obtiene el tipo de producto por peso
 */
export const getWeightType = (productName: string): WeightType => {
  const name = productName.toLowerCase();

  if (name.includes('x 100 gr')) {
    return '100gr';
  } else if (name.includes('x kg')) {
    return 'kg';
  } else {
    return 'unit';
  }
};

/**
 * Obtiene la cantidad a agregar por click según el tipo de producto
 */
export const getQuantityPerClick = (productName: string): number => {
  const weightType = getWeightType(productName);

  switch (weightType) {
    case '100gr':
      return 100; // 100 gramos por click
    case 'kg':
      return 500; // 500 gramos (medio kilo) por click
    case 'unit':
      return 1; // 1 unidad por click
    default:
      return 1;
  }
};

/**
 * Obtiene el precio unitario por gramo o unidad
 */
export const getUnitPrice = (product: Product): number => {
  return product.price; // El precio ya está definido correctamente en los datos
};

/**
 * Calcula el precio total de un item del carrito
 */
export const calculateItemPrice = (item: CartItem): number => {
  const weightType = getWeightType(item.name);

  switch (weightType) {
    case '100gr':
      // Para productos por 100gr: (cantidad en gr / 100) * precio por 100gr
      return (item.quantity / 100) * item.unitPrice;
    case 'kg':
      // Para productos por kg: (cantidad en gr / 1000) * precio por kg
      return (item.quantity / 1000) * item.unitPrice;
    case 'unit':
      // Para productos por unidad: cantidad * precio unitario
      return item.quantity * item.unitPrice;
    default:
      return item.quantity * item.unitPrice;
  }
};

/**
 * Trunca el nombre del producto según el ancho máximo
 */
export const truncateProductName = (
  name: string,
  maxLength: number
): string => {
  if (name.length <= maxLength) return name;

  // Remover sufijos comunes primero
  const cleanName = name
    .replace(' x 100 gr', '')
    .replace(' x Kg', '')
    .replace(' x kg', '')
    .replace(' x 4 u.', '')
    .replace(' x 6 u.', '')
    .replace(' x 12 u.', '')
    .replace(' (pack)', '');

  if (cleanName.length <= maxLength) return cleanName;

  // Si aún es muy largo, truncar
  return cleanName.substring(0, maxLength - 3) + '...';
};

/**
 * Formatea la cantidad mostrada según el tipo de peso
 */
export const formatQuantity = (
  quantity: number,
  weightType: WeightType
): string => {
  switch (weightType) {
    case 'kg':
      if (quantity >= 1000) {
        return `${quantity / 1000}kg`;
      } else {
        return `${quantity}gr`;
      }
    case '100gr':
      return `${quantity}gr`;
    case 'unit':
      return quantity.toString();
    default:
      return quantity.toString();
  }
};

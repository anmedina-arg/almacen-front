import { Product, CartItem, WeightType } from '../types';

/**
 * Detecta si un producto se vende por peso
 */
export const isProductByWeight = (
  product: Pick<Product, 'sale_type'>,
): boolean => {
  return product.sale_type !== 'unit';
};

/**
 * Obtiene el tipo de producto por peso
 */
export const getWeightType = (
  product: Pick<Product, 'sale_type'>,
): WeightType => {
  return product.sale_type;
};

/**
 * Obtiene la cantidad a agregar por click según el tipo de producto.
 * Caso especial: productos "noisette" (tipo kg) usan 1000g por click en lugar de 500g.
 */
export const getQuantityPerClick = (
  product: Pick<Product, 'name' | 'sale_type'>,
): number => {
  // TODO: reemplazar con columna quantity_per_click en DB cuando se requieran más casos especiales
  if (product.name.toLowerCase().includes('noisette')) {
    return 1000; // 1000 gramos por click
  }

  switch (product.sale_type) {
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
  switch (item.saleType) {
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
  maxLength: number,
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

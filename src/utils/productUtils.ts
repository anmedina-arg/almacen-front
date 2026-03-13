import type { Product, WeightType } from '@/types';

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

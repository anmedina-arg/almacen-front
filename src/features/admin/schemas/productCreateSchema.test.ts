import { describe, expect, it } from 'vitest';
import { productCreateSchema } from './productCreateSchema';

// Cubre en aislamiento la validación cruzada de Producto Surtido (#93) —
// espeja products_surtido_fields_check y products_variedades_range_check
// del lado de la base (supabase/schema/products/products.sql), para que un
// error de estos se muestre en el formulario en vez de esperar un 500/CHECK
// violation crudo del servidor.
const base = {
  name: 'Helado 1/4kg',
  price: 100,
  image: 'https://example.com/img.jpg',
};

describe('productCreateSchema — validación de Producto Surtido', () => {
  it('acepta un producto normal (is_producto_surtido=false, todo lo demás null)', () => {
    const result = productCreateSchema.safeParse({ ...base });
    expect(result.success).toBe(true);
  });

  it('acepta un Producto Surtido válido (los 3 campos presentes, min<=max)', () => {
    const result = productCreateSchema.safeParse({
      ...base,
      is_producto_surtido: true,
      familia_id: 1,
      min_variedades: 1,
      max_variedades: 3,
    });
    expect(result.success).toBe(true);
  });

  it('acepta min === max (ej. "exactamente 2 sabores")', () => {
    const result = productCreateSchema.safeParse({
      ...base,
      is_producto_surtido: true,
      familia_id: 1,
      min_variedades: 2,
      max_variedades: 2,
    });
    expect(result.success).toBe(true);
  });

  it('rechaza is_producto_surtido=true sin familia_id/min/max', () => {
    const result = productCreateSchema.safeParse({ ...base, is_producto_surtido: true });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['familia_id']);
    }
  });

  it('rechaza is_producto_surtido=true con solo familia_id (falta min/max)', () => {
    const result = productCreateSchema.safeParse({
      ...base,
      is_producto_surtido: true,
      familia_id: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rechaza is_producto_surtido=false con familia_id/min/max residuales (toggle apagado sin limpiar)', () => {
    const result = productCreateSchema.safeParse({
      ...base,
      is_producto_surtido: false,
      familia_id: 1,
      min_variedades: 1,
      max_variedades: 2,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['is_producto_surtido']);
    }
  });

  it('rechaza max_variedades menor a min_variedades', () => {
    const result = productCreateSchema.safeParse({
      ...base,
      is_producto_surtido: true,
      familia_id: 1,
      min_variedades: 3,
      max_variedades: 1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.join('.') === 'max_variedades')).toBe(true);
    }
  });

  it('rechaza min_variedades < 1', () => {
    const result = productCreateSchema.safeParse({
      ...base,
      is_producto_surtido: true,
      familia_id: 1,
      min_variedades: 0,
      max_variedades: 2,
    });
    expect(result.success).toBe(false);
  });
});

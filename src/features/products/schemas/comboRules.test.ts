import { describe, expect, it } from 'vitest';
import { createProductSchema } from './productSchemas';
import { updateComboComponentsSchema } from './comboSchemas';

// #167: un combo sin componentes es un error de carga (decisión de Andrés,
// 2026-10-30). Se corrige en el alta, sin casos especiales en la regla de
// Disponible ni de Faltante. Estas son las reglas de forma de la API; las
// que dependen de la base (rollback del alta, pasar a combo) se prueban en
// src/test/integration/combo-requires-components.test.ts.
const baseProduct = { name: 'Combo de prueba', price: 100, category_id: 1 };
const component = { component_product_id: 7, quantity: 2 };

describe('createProductSchema — combos (#167)', () => {
  it('un combo sin componentes se rechaza', () => {
    const result = createProductSchema.safeParse({ ...baseProduct, is_combo: true });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path.join('.'))).toContain('components');
  });

  it('un combo con la lista de componentes vacía se rechaza', () => {
    const result = createProductSchema.safeParse({ ...baseProduct, is_combo: true, components: [] });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path.join('.'))).toContain('components');
  });

  it('un combo con al menos un componente se acepta', () => {
    const result = createProductSchema.safeParse({ ...baseProduct, is_combo: true, components: [component] });

    expect(result.success).toBe(true);
    expect(result.data?.components).toEqual([component]);
  });

  it('un producto común no acepta componentes', () => {
    const result = createProductSchema.safeParse({ ...baseProduct, components: [component] });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path.join('.'))).toContain('components');
  });

  it('un producto común sin componentes sigue siendo válido', () => {
    expect(createProductSchema.safeParse(baseProduct).success).toBe(true);
  });
});

describe('updateComboComponentsSchema (#167)', () => {
  it('rechaza dejar el combo sin componentes', () => {
    const result = updateComboComponentsSchema.safeParse({ components: [] });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('El combo necesita al menos un componente');
  });

  it('rechaza una cantidad que no es mayor a 0', () => {
    const result = updateComboComponentsSchema.safeParse({ components: [{ component_product_id: 7, quantity: 0 }] });

    expect(result.success).toBe(false);
  });

  it('rechaza un componente con id que no es entero', () => {
    const result = updateComboComponentsSchema.safeParse({ components: [{ component_product_id: 7.5, quantity: 1 }] });

    expect(result.success).toBe(false);
  });

  it('acepta una lista con un componente', () => {
    expect(updateComboComponentsSchema.safeParse({ components: [component] }).success).toBe(true);
  });
});

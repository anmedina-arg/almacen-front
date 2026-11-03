import { describe, expect, it } from 'vitest';
import { isSinStock } from './sinStock';

describe('isSinStock', () => {
  it('es Sin stock cuando el Disponible es 0', () => {
    expect(isSinStock({ stock_quantity: 0 })).toBe(true);
  });

  it('no es Sin stock cuando hay Disponible', () => {
    expect(isSinStock({ stock_quantity: 3 })).toBe(false);
  });

  it('nunca es Sin stock si la Store no lleva Control de stock (sin dato)', () => {
    expect(isSinStock({})).toBe(false);
    expect(isSinStock({ stock_quantity: undefined })).toBe(false);
  });

  it('un Combo con Disponible 0 es Sin stock como cualquier otro producto', () => {
    const combo = { is_combo: true, stock_quantity: 0 };

    expect(isSinStock(combo)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { describeShortfall } from './orderUtils';

describe('describeShortfall (#162)', () => {
  it('un ítem sin Faltante no muestra nada', () => {
    expect(describeShortfall({ shortfall: 0, ordered_quantity: 3, is_by_weight: false })).toBeNull();
  });

  it('sin Control de stock no muestra nada', () => {
    expect(describeShortfall({ shortfall: null, ordered_quantity: 3, is_by_weight: false })).toBeNull();
  });

  it('muestra cuánto se pidió y cuánto había, en unidades', () => {
    expect(describeShortfall({ shortfall: 2, ordered_quantity: 3, is_by_weight: false })).toBe('Pidió 3, había 1');
  });

  it('un producto por peso se muestra en gramos o kilos', () => {
    expect(describeShortfall({ shortfall: 200, ordered_quantity: 500, is_by_weight: true })).toBe('Pidió 500gr, había 300gr');
    expect(describeShortfall({ shortfall: 1000, ordered_quantity: 1500, is_by_weight: true })).toBe('Pidió 1.5kg, había 500gr');
  });

  it('acepta los NUMERIC que PostgREST devuelve como string', () => {
    expect(describeShortfall({ shortfall: '2.000' as unknown as number, ordered_quantity: '3.000' as unknown as number, is_by_weight: false })).toBe('Pidió 3, había 1');
  });

  it('sin lo pedido guardado (ítem anterior a #162) muestra solo el Faltante', () => {
    expect(describeShortfall({ shortfall: 2, ordered_quantity: null, is_by_weight: false })).toBe('Faltaban 2');
  });
});

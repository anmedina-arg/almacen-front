import { describe, expect, it } from 'vitest';
import { applyRankingCosts } from './rankingCosts';

// Spec #179, ticket #186: el ranking de productos devuelve Costo y margen solo
// con la flag `costos`; y un producto sin costo registrado es "sin costo", no un
// margen igual al precio.
const row = (over: Record<string, unknown> = {}) => ({
  product_id: 1,
  product_name: 'Coca',
  units_sold: 10,
  revenue: 1000,
  current_price: 100,
  current_cost: 60,
  margin: 40,
  margin_pct: 40,
  ...over,
});

describe('applyRankingCosts', () => {
  it('con la flag apagada quita costo y margen de cada producto', () => {
    const [result] = applyRankingCosts([row()], false);
    expect(result).not.toHaveProperty('current_cost');
    expect(result).not.toHaveProperty('margin');
    expect(result).not.toHaveProperty('margin_pct');
    expect(result).toMatchObject({ product_id: 1, revenue: 1000, current_price: 100 });
  });

  it('con la flag encendida conserva el costo y el margen de un producto con costo', () => {
    const [result] = applyRankingCosts([row()], true);
    expect(result).toMatchObject({ current_cost: 60, margin: 40, margin_pct: 40 });
  });

  it('con la flag encendida, un producto sin costo registrado queda "sin costo": sin margen', () => {
    // La base devuelve costo 0 y margen = precio completo para un producto sin costo.
    const [result] = applyRankingCosts([row({ current_cost: 0, margin: 100, margin_pct: null })], true);
    expect(result.current_cost).toBeNull();
    expect(result.margin).toBeNull();
    expect(result.margin_pct).toBeNull();
  });

  it('no modifica las filas originales', () => {
    const original = row();
    applyRankingCosts([original], false);
    expect(original).toHaveProperty('current_cost', 60);
  });
});

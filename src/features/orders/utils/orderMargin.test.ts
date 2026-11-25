import { describe, expect, it } from 'vitest';
import { computeOrderMargin, omitItemCost, orderCostFields } from './orderMargin';

// Spec #179, ticket #186 (ADR-0018): el margen de un pedido se calcula solo con
// los ítems que tienen Costo registrado. Un ítem sin Costo (unit_cost 0, el
// pedido es anterior a encender el módulo o el producto no tenía costo) no suma
// ni infla el margen: queda "sin costo".
const item = (unit_price: number, unit_cost: number, subtotal: number) => ({ unit_price, unit_cost, subtotal });

describe('computeOrderMargin — cobertura de costo', () => {
  it('con todos los ítems con costo, el margen es la venta menos el costo', () => {
    const result = computeOrderMargin([item(100, 60, 200)]);
    expect(result).toEqual({ cost_coverage: 'complete', total_cost: 120, margin: 80, margin_pct: 40 });
  });

  it('suma varios ítems con costo', () => {
    const result = computeOrderMargin([item(100, 60, 200), item(50, 25, 100)]);
    expect(result.cost_coverage).toBe('complete');
    expect(result.total_cost).toBe(170);
    expect(result.margin).toBe(130);
    expect(result.margin_pct).toBeCloseTo(43.33, 1);
  });

  it('un ítem sin costo no suma al margen: solo cuentan los ítems con costo', () => {
    const result = computeOrderMargin([item(100, 60, 200), item(80, 0, 800)]);
    expect(result.cost_coverage).toBe('partial');
    expect(result.total_cost).toBe(120);
    // margen de los 200 con costo; los 800 sin costo no lo inflan
    expect(result.margin).toBe(80);
    expect(result.margin_pct).toBe(40);
  });

  it('si ningún ítem tiene costo, no hay margen: sin costo, no margen total', () => {
    const result = computeOrderMargin([item(100, 0, 200), item(50, 0, 100)]);
    expect(result).toEqual({ cost_coverage: 'none', total_cost: null, margin: null, margin_pct: null });
  });

  it('un pedido sin ítems no tiene margen', () => {
    expect(computeOrderMargin([])).toEqual({ cost_coverage: 'none', total_cost: null, margin: null, margin_pct: null });
  });

  it('un ítem de precio cero (regalo) no se puede medir y cuenta como sin costo', () => {
    const result = computeOrderMargin([item(0, 5, 0), item(100, 60, 200)]);
    expect(result.cost_coverage).toBe('partial');
    expect(result.margin).toBe(80);
  });

  it('el margen puede ser negativo', () => {
    const result = computeOrderMargin([item(100, 130, 100)]);
    expect(result.margin).toBe(-30);
    expect(result.margin_pct).toBe(-30);
  });

  it('en productos por peso usa la proporción costo/precio, no la cantidad en gramos', () => {
    // precio y costo por 100 gr, subtotal de 500 g = 5 × precio
    const result = computeOrderMargin([item(100, 70, 500)]);
    expect(result.total_cost).toBe(350);
    expect(result.margin).toBe(150);
  });

  it('acepta números que llegan como texto de la base', () => {
    const result = computeOrderMargin([{ unit_price: '100', unit_cost: '60', subtotal: '200' }]);
    expect(result.margin).toBe(80);
  });
});

describe('orderCostFields — lo que se suma al pedido en la respuesta', () => {
  it('con la flag apagada no suma ningún campo de costo', () => {
    expect(orderCostFields([item(100, 60, 200)], false)).toEqual({});
  });

  it('con la flag encendida suma costo, margen y cobertura', () => {
    expect(orderCostFields([item(100, 60, 200)], true)).toEqual({ cost_coverage: 'complete', total_cost: 120, margin: 80, margin_pct: 40 });
  });

  it('un ítem sin unit_cost (no se trajo) cuenta como sin costo', () => {
    expect(orderCostFields([{ unit_price: 100, subtotal: 200 }], true)).toMatchObject({ cost_coverage: 'none', margin: null });
  });
});

describe('omitItemCost', () => {
  it('quita unit_cost del ítem y deja el resto', () => {
    const result = omitItemCost({ id: 1, product_name: 'x', unit_price: 10, unit_cost: 6, subtotal: 20 });
    expect(result).toEqual({ id: 1, product_name: 'x', unit_price: 10, subtotal: 20 });
    expect(result).not.toHaveProperty('unit_cost');
  });

  it('no modifica el ítem original', () => {
    const original = { id: 1, unit_cost: 6 };
    omitItemCost(original);
    expect(original).toHaveProperty('unit_cost', 6);
  });
});

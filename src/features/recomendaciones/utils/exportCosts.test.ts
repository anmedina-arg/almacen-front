import { describe, expect, it } from 'vitest';
import { applyExportCosts } from './exportCosts';

// Spec #179, ticket #186: los informes descargables no incluyen Costo ni margen
// con la flag `costos` apagada; encendida, las filas sin costo salen en blanco,
// no con un margen igual a la venta.
describe('applyExportCosts — informe de productos', () => {
  const fila = (over: Record<string, unknown> = {}) => ({ producto: 'Coca', precio: 100, costo: 60, margen: 40, margen_pct: 40, ...over });

  it('apagada: quita las columnas de costo y margen', () => {
    const [result] = applyExportCosts([fila()], 'productos', false);
    expect(Object.keys(result)).toEqual(['producto', 'precio']);
  });

  it('encendida: conserva costo y margen de un producto con costo', () => {
    expect(applyExportCosts([fila()], 'productos', true)[0]).toMatchObject({ costo: 60, margen: 40, margen_pct: 40 });
  });

  it('encendida: un producto sin costo sale con costo y margen en blanco', () => {
    const [result] = applyExportCosts([fila({ costo: 0, margen: 100, margen_pct: null })], 'productos', true);
    expect(result).toMatchObject({ costo: null, margen: null, margen_pct: null });
    expect(result.precio).toBe(100);
  });
});

describe('applyExportCosts — informe de ventas', () => {
  const fila = (over: Record<string, unknown> = {}) => ({ producto: 'Coca', subtotal: 200, costo_total: 120, margen: 80, margen_pct: 40, ...over });

  it('apagada: quita costo_total, margen y margen_pct', () => {
    const [result] = applyExportCosts([fila()], 'ventas', false);
    expect(Object.keys(result)).toEqual(['producto', 'subtotal']);
  });

  it('encendida: una venta sin costo registrado sale con costo y margen en blanco', () => {
    const [result] = applyExportCosts([fila({ costo_total: 0, margen: 200, margen_pct: 100 })], 'ventas', true);
    expect(result).toMatchObject({ costo_total: null, margen: null, margen_pct: null, subtotal: 200 });
  });

  it('encendida: una venta con costo conserva los valores', () => {
    expect(applyExportCosts([fila()], 'ventas', true)[0]).toMatchObject({ costo_total: 120, margen: 80, margen_pct: 40 });
  });
});

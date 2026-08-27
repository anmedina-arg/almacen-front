import { beforeEach, describe, expect, it } from 'vitest';
import { useCartStore } from './cartStore';
import type { Product } from '../types';

// Seam 2 de #94 (spec #91): cartStore a nivel de store, sin DOM — ver
// resolveWhatsappNumber.test.ts como referencia de nivel. No se testea el
// modal "Elegir sabores": la validación de mínimo/máximo y el armado de
// líneas vive entera en confirmSurtidoUnits, testeable sin montar UI.

function makeSurtidoProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Helado 1/2kg',
    price: 3000,
    image: '',
    active: true,
    categories: '',
    mainCategory: 'otros',
    sale_type: 'unit',
    is_producto_surtido: true,
    familia_id: 10,
    min_variedades: 1,
    max_variedades: 3,
    ...overrides,
  };
}

const resetStore = () =>
  useCartStore.setState({ items: [], totalItems: 0, totalPrice: 0, pendingSurtido: [] });

describe('cartStore — Producto Surtido (#94)', () => {
  beforeEach(resetStore);

  it('dos unidades del mismo producto con combinación idéntica de Variedades generan dos líneas separadas', () => {
    const product = makeSurtidoProduct();
    const chocolate = { id: 100, name: 'Chocolate' };
    const frutilla = { id: 101, name: 'Frutilla' };

    const result = useCartStore.getState().confirmSurtidoUnits(product, [
      [chocolate, frutilla],
      [chocolate, frutilla],
    ]);

    expect(result.success).toBe(true);
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(2);
    expect(items[0].lineId).not.toBe(items[1].lineId);
    expect(items[0].variedades).toEqual([chocolate, frutilla]);
    expect(items[1].variedades).toEqual([chocolate, frutilla]);
    expect(useCartStore.getState().totalItems).toBe(2);
  });

  it('rechaza confirmar con menos Variedades que el mínimo, sin mutar el carrito', () => {
    const product = makeSurtidoProduct({ min_variedades: 2, max_variedades: 3 });
    const result = useCartStore.getState().confirmSurtidoUnits(product, [[{ id: 1, name: 'A' }]]);

    expect(result.success).toBe(false);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('rechaza confirmar con más Variedades que el máximo', () => {
    const product = makeSurtidoProduct({ min_variedades: 1, max_variedades: 1 });
    const result = useCartStore.getState().confirmSurtidoUnits(product, [
      [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
    ]);

    expect(result.success).toBe(false);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('rechaza Variedades repetidas dentro de la misma unidad', () => {
    const product = makeSurtidoProduct({ min_variedades: 1, max_variedades: 3 });
    const result = useCartStore.getState().confirmSurtidoUnits(product, [
      [{ id: 1, name: 'A' }, { id: 1, name: 'A' }],
    ]);

    expect(result.success).toBe(false);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('stagePendingSurtidoUnit acumula unidades pendientes sin tocar el carrito', () => {
    const product = makeSurtidoProduct();

    useCartStore.getState().stagePendingSurtidoUnit(product);
    useCartStore.getState().stagePendingSurtidoUnit(product);

    expect(useCartStore.getState().items).toHaveLength(0);
    expect(useCartStore.getState().pendingSurtido).toEqual([
      { productId: product.id, productName: product.name, count: 2 },
    ]);
  });

  it('existe una señal consultable que detecta unidades pendientes sin confirmar — se apaga al confirmar', () => {
    const product = makeSurtidoProduct();

    expect(useCartStore.getState().pendingSurtido.some((p) => p.count > 0)).toBe(false);

    useCartStore.getState().stagePendingSurtidoUnit(product);
    expect(useCartStore.getState().pendingSurtido.some((p) => p.count > 0)).toBe(true);

    useCartStore.getState().confirmSurtidoUnits(product, [[{ id: 1, name: 'A' }]]);
    expect(useCartStore.getState().pendingSurtido.some((p) => p.count > 0)).toBe(false);
  });

  it('confirmar con selección inválida deja la señal de pendiente encendida', () => {
    const product = makeSurtidoProduct({ min_variedades: 2 });
    useCartStore.getState().stagePendingSurtidoUnit(product);

    const result = useCartStore.getState().confirmSurtidoUnits(product, [[{ id: 1, name: 'A' }]]);

    expect(result.success).toBe(false);
    expect(useCartStore.getState().pendingSurtido.some((p) => p.count > 0)).toBe(true);
  });

  it('removeSurtidoUnit descarta una unidad pendiente antes de tocar una línea confirmada', () => {
    const product = makeSurtidoProduct();
    useCartStore.getState().confirmSurtidoUnits(product, [[{ id: 1, name: 'A' }]]);
    useCartStore.getState().stagePendingSurtidoUnit(product);

    useCartStore.getState().removeSurtidoUnit(product);

    expect(useCartStore.getState().pendingSurtido).toEqual([]);
    expect(useCartStore.getState().items).toHaveLength(1);
  });

  it('removeSurtidoUnit quita la última línea confirmada cuando no hay unidades pendientes', () => {
    const product = makeSurtidoProduct();
    useCartStore.getState().confirmSurtidoUnits(product, [
      [{ id: 1, name: 'A' }],
      [{ id: 2, name: 'B' }],
    ]);

    useCartStore.getState().removeSurtidoUnit(product);

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].variedades).toEqual([{ id: 1, name: 'A' }]);
  });

  it('reconfirmar reemplaza todas las líneas existentes del producto (editar desde "Elegir sabores")', () => {
    const product = makeSurtidoProduct();
    useCartStore.getState().confirmSurtidoUnits(product, [[{ id: 1, name: 'A' }]]);

    useCartStore.getState().confirmSurtidoUnits(product, [
      [{ id: 2, name: 'B' }],
      [{ id: 3, name: 'C' }],
    ]);

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.variedades?.[0].name)).toEqual(['B', 'C']);
    expect(useCartStore.getState().totalItems).toBe(2);
  });

  it('confirmar líneas de un Producto Surtido no se fusiona con productos normales del mismo id inexistente', () => {
    const surtido = makeSurtidoProduct({ id: 5 });
    const otroSurtido = makeSurtidoProduct({ id: 6, name: 'Helado 1kg' });

    useCartStore.getState().confirmSurtidoUnits(surtido, [[{ id: 1, name: 'A' }]]);
    useCartStore.getState().confirmSurtidoUnits(otroSurtido, [[{ id: 1, name: 'A' }]]);

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.id).sort()).toEqual([5, 6]);
  });
});

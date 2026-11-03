import { beforeEach, describe, expect, it } from 'vitest';
import {
  formatOrderSummary,
  formatOrderTotal,
  getOrderSummary,
  getOrderTotal,
  type OrderSummaryItem,
} from './orderSummary';
import { useCartStore } from '../stores/cartStore';
import type { Product } from '../types';

const weightLine = (id: number, grams: number): OrderSummaryItem => ({
  id,
  quantity: grams,
  isByWeight: true,
});

const unitLine = (id: number, quantity: number): OrderSummaryItem => ({
  id,
  quantity,
  isByWeight: false,
});

describe('getOrderSummary', () => {
  it('un pedido vacío tiene 0 productos y 0 unidades', () => {
    expect(getOrderSummary([])).toEqual({ products: 0, units: 0 });
  });

  it('dos unidades de una gaseosa son 1 producto y 2 unidades', () => {
    expect(getOrderSummary([unitLine(1, 2)])).toEqual({ products: 1, units: 2 });
  });

  it('un producto por peso cuenta 1 unidad sin importar los gramos', () => {
    expect(getOrderSummary([weightLine(2, 100)])).toEqual({ products: 1, units: 1 });
    expect(getOrderSummary([weightLine(2, 500)])).toEqual({ products: 1, units: 1 });
  });

  it('dos gaseosas iguales y 300 g de jamón son 2 productos y 3 unidades', () => {
    expect(getOrderSummary([unitLine(1, 2), weightLine(2, 300)])).toEqual({
      products: 2,
      units: 3,
    });
  });

  it('un Producto Surtido con varias líneas es un solo producto con sus unidades', () => {
    const lines = [unitLine(7, 1), unitLine(7, 1), unitLine(7, 1)];

    expect(getOrderSummary(lines)).toEqual({ products: 1, units: 3 });
  });
});

// El resumen se prueba también sobre el carrito real: las líneas que armó el
// store son las que la barra de pedido va a contar (#175).
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Producto',
    price: 1000,
    image: '',
    active: true,
    categories: '',
    sale_type: 'unit',
    ...overrides,
  };
}

const resetStore = () =>
  useCartStore.setState({ items: [], totalItems: 0, totalPrice: 0, pendingSurtido: [] });

describe('getOrderSummary sobre el carrito real', () => {
  beforeEach(resetStore);

  it('sumar 100 g y luego 500 g del mismo producto por peso sigue siendo 1 producto y 1 unidad', () => {
    const jamon = makeProduct({ id: 2, name: 'Jamón x 100 gr', sale_type: '100gr' });
    const { addToCart } = useCartStore.getState();

    addToCart(jamon);
    expect(getOrderSummary(useCartStore.getState().items)).toEqual({ products: 1, units: 1 });

    for (let i = 0; i < 4; i += 1) addToCart(jamon);
    const [line] = useCartStore.getState().items;

    expect(line.quantity).toBe(500);
    expect(getOrderSummary(useCartStore.getState().items)).toEqual({ products: 1, units: 1 });
  });

  it('una unidad de Producto Surtido sin Variedades elegidas todavía no es parte del pedido', () => {
    const helado = makeProduct({
      id: 3,
      name: 'Helado 1/2kg',
      is_producto_surtido: true,
      familia_id: 10,
      min_variedades: 1,
      max_variedades: 3,
    });

    useCartStore.getState().stagePendingSurtidoUnit(helado);

    expect(useCartStore.getState().pendingSurtido).toHaveLength(1);
    expect(getOrderSummary(useCartStore.getState().items)).toEqual({ products: 0, units: 0 });
  });
});

describe('formatOrderSummary', () => {
  it('escribe plural cuando no hay nada, porque cero va en plural', () => {
    expect(formatOrderSummary({ products: 0, units: 0 })).toBe('0 productos · 0 unidades');
  });

  it('escribe singular cuando hay 1 producto y 1 unidad', () => {
    expect(formatOrderSummary({ products: 1, units: 1 })).toBe('1 producto · 1 unidad');
  });

  it('escribe plural cuando hay varios productos y unidades', () => {
    expect(formatOrderSummary({ products: 2, units: 3 })).toBe('2 productos · 3 unidades');
  });

  it('mezcla singular y plural cuando corresponde', () => {
    expect(formatOrderSummary({ products: 1, units: 2 })).toBe('1 producto · 2 unidades');
  });
});

describe('getOrderTotal', () => {
  it('un pedido vacío suma 0', () => {
    expect(getOrderTotal([])).toBe(0);
  });

  it('suma unidades por su precio: 2 gaseosas de 3000 son 6000', () => {
    expect(getOrderTotal([{ quantity: 2, saleType: 'unit', unitPrice: 3000 }])).toBe(6000);
  });

  it('cobra los productos por peso según los gramos: 500 g a 800 cada 100 g son 4000', () => {
    expect(getOrderTotal([{ quantity: 500, saleType: '100gr', unitPrice: 800 }])).toBe(4000);
  });

  it('cobra por kilo: 1500 g a 9000 el kilo son 13500', () => {
    expect(getOrderTotal([{ quantity: 1500, saleType: 'kg', unitPrice: 9000 }])).toBe(13500);
  });

  it('suma todas las líneas del pedido', () => {
    const lines = [
      { quantity: 2, saleType: 'unit' as const, unitPrice: 3000 },
      { quantity: 500, saleType: 'kg' as const, unitPrice: 9000 },
    ];

    expect(getOrderTotal(lines)).toBe(10500);
  });
});

describe('formatOrderTotal', () => {
  it('escribe el total como los precios del catálogo: signo de pesos y número', () => {
    expect(formatOrderTotal(6000)).toBe('$6000');
  });

  it('conserva los centavos cuando hay', () => {
    expect(formatOrderTotal(4500.5)).toBe('$4500.5');
  });

  it('no muestra ruido de coma flotante', () => {
    expect(formatOrderTotal(0.1 + 0.2)).toBe('$0.3');
  });
});

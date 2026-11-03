import { describe, expect, it } from 'vitest';
import type { Product } from '../types';
import { sortCatalogProducts } from './sortCatalogProducts';

function product(overrides: Partial<Product> & Pick<Product, 'id' | 'name'>): Product {
  return {
    price: 1000,
    image: '',
    active: true,
    categories: '',
    sale_type: 'kg',
    ...overrides,
  };
}

const names = (products: Product[]) => products.map((p) => p.name);

describe('sortCatalogProducts', () => {
  it('dos marcas del mismo producto: va primero la que tiene stock aunque la otra sea Más vendida', () => {
    const verona = product({ id: 1, name: 'Queso cremoso La Verona', stock_quantity: 0, is_top_seller: true });
    const paulina = product({ id: 2, name: 'Queso cremoso La Paulina', stock_quantity: 4 });

    expect(names(sortCatalogProducts([verona, paulina]))).toEqual([
      'Queso cremoso La Paulina',
      'Queso cremoso La Verona',
    ]);
  });

  it('entre los que tienen stock, los Más vendidos van antes', () => {
    const alfajor = product({ id: 1, name: 'Alfajor', stock_quantity: 10 });
    const budin = product({ id: 2, name: 'Budín', stock_quantity: 10, is_top_seller: true });

    expect(names(sortCatalogProducts([alfajor, budin]))).toEqual(['Budín', 'Alfajor']);
  });

  it('empatados en todo, conserva el orden con el que llegan (alfabético)', () => {
    const a = product({ id: 1, name: 'Arroz', stock_quantity: 5 });
    const b = product({ id: 2, name: 'Fideos', stock_quantity: 5 });
    const c = product({ id: 3, name: 'Harina', stock_quantity: 5 });

    expect(names(sortCatalogProducts([a, b, c]))).toEqual(['Arroz', 'Fideos', 'Harina']);
  });

  it('los Sin stock quedan al final, y entre ellos el Más vendido sigue primero', () => {
    const conStock = product({ id: 1, name: 'Zanahoria', stock_quantity: 2 });
    const sinStock = product({ id: 2, name: 'Arroz', stock_quantity: 0 });
    const sinStockMasVendido = product({ id: 3, name: 'Fideos', stock_quantity: 0, is_top_seller: true });

    expect(names(sortCatalogProducts([sinStock, sinStockMasVendido, conStock]))).toEqual([
      'Zanahoria',
      'Fideos',
      'Arroz',
    ]);
  });

  it('un producto sin dato de stock (Store sin Control de stock) no baja', () => {
    const sinDato = product({ id: 1, name: 'Arroz' });
    const conStock = product({ id: 2, name: 'Fideos', stock_quantity: 3 });
    const sinStock = product({ id: 3, name: 'Aceite', stock_quantity: 0 });

    expect(names(sortCatalogProducts([sinDato, sinStock, conStock]))).toEqual(['Arroz', 'Fideos', 'Aceite']);
  });

  it('una Store sin Control de stock ordena solo por Más vendido, como antes', () => {
    const a = product({ id: 1, name: 'Arroz' });
    const b = product({ id: 2, name: 'Budín', is_top_seller: true });
    const c = product({ id: 3, name: 'Café' });

    expect(names(sortCatalogProducts([a, b, c]))).toEqual(['Budín', 'Arroz', 'Café']);
  });

  it('un Combo con Disponible 0 baja como cualquier otro producto Sin stock', () => {
    const combo = product({ id: 1, name: 'Combo desayuno', is_combo: true, stock_quantity: 0, is_top_seller: true });
    const normal = product({ id: 2, name: 'Yerba', stock_quantity: 1 });

    expect(names(sortCatalogProducts([combo, normal]))).toEqual(['Yerba', 'Combo desayuno']);
  });

  it('no modifica el arreglo de entrada', () => {
    const sinStock = product({ id: 1, name: 'Arroz', stock_quantity: 0 });
    const conStock = product({ id: 2, name: 'Fideos', stock_quantity: 3 });
    const input = [sinStock, conStock];

    sortCatalogProducts(input);

    expect(names(input)).toEqual(['Arroz', 'Fideos']);
  });
});

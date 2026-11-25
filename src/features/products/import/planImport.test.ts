import { describe, expect, it } from 'vitest';
import { buildRejectedRowsCsv, planImport } from './planImport';
import { DEFAULT_PRODUCT_IMAGE } from './defaultProductImage';
import { validateImport, type ImportContext, type ImportSheet } from './validateImport';

// Seam B de la spec #179 (segunda mitad): de la vista previa + lo que el
// Store admin confirmó → qué se crea y qué queda afuera. Puro: sin base ni HTTP.
const ctx: ImportContext = {
  existingProductNames: ['Papas'],
  isAllowedImageUrl: () => true,
  categories: [{ name: 'Gaseosas', subcategories: ['Cola'] }, { name: 'Snacks', subcategories: [] }],
};
const HEADERS = ['nombre', 'categoría', 'subcategoría', 'tipo de venta', 'precio', 'imagen_url', 'activo'];

const sheet = (rows: Record<string, unknown>[]): ImportSheet => ({ headers: HEADERS, rows: rows as ImportSheet['rows'] });
const fila = (o: Record<string, unknown>) => ({ nombre: 'X', 'categoría': 'Gaseosas', precio: 100, ...o });
const plan = (rows: Record<string, unknown>[], includeDuplicateRows: number[] = []) =>
  planImport(validateImport(sheet(rows), ctx), { includeDuplicateRows });

describe('planImport — qué se crea', () => {
  it('crea las filas válidas y las que solo traen una advertencia de categoría nueva', () => {
    const p = plan([fila({ nombre: 'Coca' }), fila({ nombre: 'Alfajor', 'categoría': 'Golosinas' })]);
    expect(p.products.map((r) => r.name)).toEqual(['Coca', 'Alfajor']);
    expect(p.skipped).toEqual([]);
  });

  it('las filas con error quedan afuera, con su motivo', () => {
    const p = plan([fila({ nombre: 'Coca' }), fila({ nombre: 'Mala', precio: '' })]);
    expect(p.products.map((r) => r.name)).toEqual(['Coca']);
    expect(p.skipped).toHaveLength(1);
    expect(p.skipped[0]).toMatchObject({ rowNumber: 3, reasons: ['El precio es obligatorio'] });
  });

  it('los posibles duplicados se omiten por defecto, con su motivo', () => {
    const p = plan([fila({ nombre: 'Papas', 'categoría': 'Snacks' })]);
    expect(p.products).toEqual([]);
    expect(p.skipped[0].reasons).toContain('Posible duplicado: ya existe un producto con este nombre en la Store');
  });

  it('un duplicado se crea si el usuario lo incluye a propósito', () => {
    const p = plan([fila({ nombre: 'Papas', 'categoría': 'Snacks' })], [2]);
    expect(p.products.map((r) => r.name)).toEqual(['Papas']);
    expect(p.skipped).toEqual([]);
  });

  it('incluir una fila que no es duplicado ni existe no cambia nada', () => {
    const p = plan([fila({ nombre: 'Coca' })], [2, 99]);
    expect(p.products).toHaveLength(1);
  });

  it('una fila con error no se puede forzar aunque se la incluya', () => {
    const p = plan([fila({ nombre: '', precio: 5 })], [2]);
    expect(p.products).toEqual([]);
  });

  it('un archivo rechazado entero no crea nada', () => {
    const p = planImport(validateImport({ headers: ['nombre'], rows: [] }, ctx), { includeDuplicateRows: [] });
    expect(p).toEqual({ products: [], newCategories: [], newSubcategories: [], skipped: [] });
  });
});

describe('planImport — valores por defecto', () => {
  it('sin imagen_url el producto queda con la imagen genérica', () => {
    expect(plan([fila({})]).products[0].imageUrl).toBe(DEFAULT_PRODUCT_IMAGE);
  });

  it('con imagen_url se respeta', () => {
    const p = plan([fila({ imagen_url: 'https://example.com/a.jpg' })]);
    expect(p.products[0].imageUrl).toBe('https://example.com/a.jpg');
  });

  it('sin activo el producto queda activo', () => {
    expect(plan([fila({})]).products[0].active).toBe(true);
  });
});

describe('planImport — categorías y subcategorías a crear', () => {
  it('solo cuenta las que necesitan las filas que se crean', () => {
    // Golosinas solo la usa una fila con error: no hay que crearla.
    const p = plan([fila({ nombre: 'Coca' }), fila({ nombre: 'Sin precio', 'categoría': 'Golosinas', precio: '' })]);
    expect(p.newCategories).toEqual([]);
  });

  it('una categoría que solo usa un duplicado omitido no se crea; si se incluye, sí', () => {
    const rows = [fila({ nombre: 'Papas', 'categoría': 'Golosinas' })];
    expect(plan(rows).newCategories).toEqual([]);
    expect(plan(rows, [2]).newCategories).toEqual(['Golosinas']);
  });

  it('lista cada categoría y subcategoría nueva una sola vez', () => {
    const p = plan([
      fila({ nombre: 'A', 'categoría': 'Golosinas', subcategoría: 'Chicles' }),
      fila({ nombre: 'B', 'categoría': 'Golosinas', subcategoría: 'Chicles' }),
      fila({ nombre: 'C', subcategoría: 'Naranja' }),
    ]);
    expect(p.newCategories).toEqual(['Golosinas']);
    expect(p.newSubcategories).toEqual([
      { categoryName: 'Golosinas', name: 'Chicles' },
      { categoryName: 'Gaseosas', name: 'Naranja' },
    ]);
  });

  it('una subcategoría que ya existe no se lista', () => {
    expect(plan([fila({ subcategoría: 'Cola' })]).newSubcategories).toEqual([]);
  });
});

describe('buildRejectedRowsCsv — archivo para corregir y volver a subir', () => {
  const build = (rows: Record<string, unknown>[], include: number[] = []) => {
    const preview = validateImport(sheet(rows), ctx);
    return buildRejectedRowsCsv(preview, planImport(preview, { includeDuplicateRows: include }).skipped);
  };

  it('trae los encabezados originales más una columna motivo, y solo las filas rechazadas', () => {
    const csv = build([fila({ nombre: 'Coca' }), fila({ nombre: 'Mala', precio: '' })]);
    const lines = csv.replace(/^﻿/, '').trim().split('\r\n');
    expect(lines[0]).toBe('nombre;categoría;subcategoría;tipo de venta;precio;imagen_url;activo;motivo');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('Mala;Gaseosas;;;;;;El precio es obligatorio');
  });

  it('conserva los valores originales tal como los escribió el usuario', () => {
    const csv = build([fila({ nombre: 'Mala', precio: '3.200,50x' })]);
    expect(csv).toContain('3.200,50x');
  });

  it('une varios motivos y escapa comillas, separadores y saltos de línea', () => {
    const csv = build([fila({ nombre: 'Con "comillas"; y\nsalto', precio: 'abc', 'tipo de venta': 'litro' })]);
    expect(csv).toContain('"Con ""comillas""; y\nsalto"');
    expect(csv).toContain('El precio debe ser un número mayor a 0 | Tipo de venta inválido: usá unidad, 100gr o kg');
  });

  it('incluye los duplicados omitidos con su motivo', () => {
    const csv = build([fila({ nombre: 'Papas', 'categoría': 'Snacks' })]);
    expect(csv).toContain('Posible duplicado');
  });

  it('empieza con BOM para que Excel abra las tildes', () => {
    expect(build([fila({ nombre: '' })]).startsWith('﻿')).toBe(true);
  });

  it('sin filas rechazadas devuelve solo el encabezado', () => {
    const lines = build([fila({ nombre: 'Coca' })]).replace(/^﻿/, '').trim().split('\r\n');
    expect(lines).toHaveLength(1);
  });
});

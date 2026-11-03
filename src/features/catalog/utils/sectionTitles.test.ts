import { describe, expect, it } from 'vitest';
import {
  formatCategoryCount,
  formatProductCount,
  hasSingleSameNameSubcategory,
} from './sectionTitles';

describe('hasSingleSameNameSubcategory', () => {
  it('una categoría con una sola subcategoría del mismo nombre lleva un solo título', () => {
    expect(hasSingleSameNameSubcategory('Gaseosas', ['Gaseosas'])).toBe(true);
  });

  it('no distingue mayúsculas ni espacios sobrantes', () => {
    expect(hasSingleSameNameSubcategory('gaseosas', [' Gaseosas '])).toBe(true);
  });

  it('una sola subcategoría con otro nombre mantiene su subtítulo', () => {
    expect(hasSingleSameNameSubcategory('Snacks', ['Papas fritas'])).toBe(false);
  });

  it('varias subcategorías mantienen sus subtítulos aunque una se llame igual', () => {
    expect(hasSingleSameNameSubcategory('Snacks', ['Snacks', 'Papas fritas'])).toBe(false);
  });

  it('una categoría sin subcategorías no tiene nada que unificar', () => {
    expect(hasSingleSameNameSubcategory('Snacks', [])).toBe(false);
  });
});

describe('formatProductCount', () => {
  it('escribe singular con 1 producto', () => {
    expect(formatProductCount(1)).toBe('1 producto');
  });

  it('escribe plural con varios productos', () => {
    expect(formatProductCount(9)).toBe('9 productos');
  });
});

describe('formatCategoryCount', () => {
  it('escribe singular con 1 categoría', () => {
    expect(formatCategoryCount(1)).toBe('1 categoría');
  });

  it('escribe plural con tilde cuando hay varias', () => {
    expect(formatCategoryCount(3)).toBe('3 categorías');
  });
});

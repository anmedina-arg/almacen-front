import { describe, expect, it } from 'vitest';
import {
  formatCategoryCount,
  formatProductCount,
  groupBySubcategory,
  hasSingleSameNameSubcategory,
  resolveSubcategoryLabel,
} from './sectionTitles';

// Agrupa los productos de UNA categoría por subcategoría. La clave del grupo
// no distingue mayúsculas ni espacios: el título y el id del DOM se derivan de
// ella, y dos grupos con la misma clave romperían el render (#181).
describe('groupBySubcategory', () => {
  it('agrupa por subcategoría respetando el orden de aparición', () => {
    const groups = groupBySubcategory(
      [
        { id: 1, subcategory_name: 'Papas' },
        { id: 2, subcategory_name: 'Chizitos' },
        { id: 3, subcategory_name: 'Papas' },
      ],
      'Snacks'
    );
    expect(groups.map((g) => [g.label, g.items.map((p) => p.id)])).toEqual([
      ['Papas', [1, 3]],
      ['Chizitos', [2]],
    ]);
  });

  it('los productos sin subcategoría quedan bajo el nombre de la categoría', () => {
    const groups = groupBySubcategory(
      [{ id: 1, subcategory_name: null }, { id: 2 }],
      'Gaseosas'
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Gaseosas');
    expect(groups[0].items.map((p) => p.id)).toEqual([1, 2]);
  });

  it('una subcategoría que solo difiere en mayúsculas del nombre de la categoría es un único grupo', () => {
    const groups = groupBySubcategory(
      [{ id: 1, subcategory_name: 'gaseosas' }, { id: 2, subcategory_name: null }],
      'Gaseosas'
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe('gaseosas');
    expect(groups[0].label).toBe('gaseosas');
    expect(groups[0].items.map((p) => p.id)).toEqual([1, 2]);
  });

  it('cada grupo tiene una clave única', () => {
    const groups = groupBySubcategory(
      [{ id: 1, subcategory_name: 'Papas' }, { id: 2, subcategory_name: ' papas ' }, { id: 3, subcategory_name: 'Otros' }],
      'Snacks'
    );
    expect(new Set(groups.map((g) => g.key)).size).toBe(groups.length);
  });
});

// #181: la columna legacy de texto libre ya no participa. Un producto sin
// subcategoría se agrupa bajo el nombre de su categoría, y la regla de #174
// (una sola subcategoría del mismo nombre) lo muestra con un solo título.
describe('resolveSubcategoryLabel', () => {
  it('con subcategoría usa el nombre de la subcategoría', () => {
    expect(resolveSubcategoryLabel('Papas fritas', 'Snacks')).toBe('Papas fritas');
  });

  it('sin subcategoría usa el nombre de la categoría', () => {
    expect(resolveSubcategoryLabel(null, 'Gaseosas')).toBe('Gaseosas');
    expect(resolveSubcategoryLabel(undefined, 'Gaseosas')).toBe('Gaseosas');
  });

  it('una subcategoría vacía o de solo espacios cuenta como ausente', () => {
    expect(resolveSubcategoryLabel('', 'Snacks')).toBe('Snacks');
    expect(resolveSubcategoryLabel('   ', 'Snacks')).toBe('Snacks');
  });

  it('con solo productos sin subcategoría la categoría lleva un solo título', () => {
    const labels = [resolveSubcategoryLabel(null, 'Gaseosas'), resolveSubcategoryLabel(undefined, 'Gaseosas')];
    expect(hasSingleSameNameSubcategory('Gaseosas', Array.from(new Set(labels)))).toBe(true);
  });
});

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

import { describe, expect, it } from 'vitest';
import { validateImport, type ImportContext, type ImportSheet } from './validateImport';

// Seam B de la spec #179: filas de la planilla + contexto de la Store →
// vista previa. Módulo puro: sin base, sin HTTP, sin archivos.
const ctx: ImportContext = {
  existingProductNames: [],
  isAllowedImageUrl: (url) => !url.includes('prohibido'),
  modules: { costos: false, stock: false },
  categories: [
    { name: 'Gaseosas', subcategories: ['Cola', 'Lima limón'] },
    { name: 'Snacks', subcategories: [] },
  ],
};

const HEADERS = ['nombre', 'categoría', 'subcategoría', 'tipo de venta', 'precio', 'imagen_url', 'activo'];

function sheet(rows: Record<string, unknown>[], headers: string[] = HEADERS): ImportSheet {
  return { headers, rows: rows as ImportSheet["rows"] };
}

describe('validateImport — filas válidas', () => {
  it('una fila completa y correcta es válida y trae el producto normalizado', () => {
    const preview = validateImport(
      sheet([
        {
          nombre: ' Coca Cola 1.5 L ',
          'categoría': 'Gaseosas',
          'subcategoría': 'Cola',
          'tipo de venta': 'unidad',
          precio: 3500,
          imagen_url: 'https://example.com/coca.jpg',
          activo: 'sí',
        },
      ]),
      ctx
    );
    expect(preview.fileError).toBeNull();
    expect(preview.rows).toHaveLength(1);
    expect(preview.rows[0].status).toBe('valid');
    expect(preview.rows[0].messages).toEqual([]);
    expect(preview.rows[0].product).toEqual({
      name: 'Coca Cola 1.5 L',
      categoryName: 'Gaseosas',
      subcategoryName: 'Cola',
      saleType: 'unit',
      price: 3500,
      imageUrl: 'https://example.com/coca.jpg',
      active: true,
      cost: null,
      initialStock: null,
    });
    expect(preview.counts).toEqual({ valid: 1, warning: 0, error: 0 });
  });

  it('con solo las columnas obligatorias aplica los valores por defecto', () => {
    const preview = validateImport(
      sheet([{ nombre: 'Papas', 'categoría': 'Snacks', precio: '1200' }], ['nombre', 'categoría', 'precio']),
      ctx
    );
    expect(preview.rows[0].status).toBe('valid');
    expect(preview.rows[0].product).toMatchObject({
      subcategoryName: null,
      saleType: 'unit',
      imageUrl: null,
      active: true,
      price: 1200,
    });
  });

  it('los encabezados no distinguen mayúsculas, tildes, espacios ni guiones bajos', () => {
    const preview = validateImport(
      sheet([{ Nombre: 'Papas', Categoria: 'Snacks', Precio: 10, Tipo_de_Venta: 'kg' }], [
        'Nombre',
        'Categoria',
        'Precio',
        'Tipo_de_Venta',
      ]),
      ctx
    );
    expect(preview.rows[0].status).toBe('valid');
    expect(preview.rows[0].product?.saleType).toBe('kg');
  });
});

const base = { nombre: 'Papas', 'categoría': 'Snacks', precio: 1200 };
const one = (row: Record<string, unknown>, c: ImportContext = ctx) =>
  validateImport(sheet([{ ...base, ...row }]), c).rows[0];

describe('validateImport — obligatorias', () => {
  it.each([
    ['nombre', 'El nombre es obligatorio'],
    ['categoría', 'La categoría es obligatoria'],
    ['precio', 'El precio es obligatorio'],
  ])('una fila sin %s es un error', (column, message) => {
    const row = one({ [column]: '' });
    expect(row.status).toBe('error');
    expect(row.messages).toContain(message);
    expect(row.product).toBeNull();
  });

  it('un error no frena a las demás filas', () => {
    const preview = validateImport(
      sheet([{ ...base }, { ...base, nombre: '' }, { ...base, nombre: 'Chizitos' }]),
      ctx
    );
    expect(preview.rows.map((r) => r.status)).toEqual(['valid', 'error', 'valid']);
    expect(preview.counts).toEqual({ valid: 2, warning: 0, error: 1 });
  });

  it('las filas se numeran como en la planilla, con el encabezado en la fila 1', () => {
    const preview = validateImport(sheet([{ ...base }, { ...base }]), ctx);
    expect(preview.rows.map((r) => r.rowNumber)).toEqual([2, 3]);
  });

  it('un nombre de más de 100 caracteres es un error', () => {
    expect(one({ nombre: 'x'.repeat(101) }).messages).toContain('El nombre no puede pasar de 100 caracteres');
  });

  it('las filas totalmente vacías se saltean sin contarlas', () => {
    const preview = validateImport(sheet([{ ...base }, { nombre: '', precio: '' }, {}]), ctx);
    expect(preview.rows).toHaveLength(1);
  });
});

describe('validateImport — precio', () => {
  it.each([
    ['3500', 3500],
    [3500, 3500],
    ['3500,50', 3500.5],
    ['3500.50', 3500.5],
    ['1.234,56', 1234.56],
    ['1,234.56', 1234.56],
    ['$ 3500', 3500],
  ])('acepta %s como %s', (input, expected) => {
    const row = one({ precio: input });
    expect(row.status).toBe('valid');
    expect(row.product?.price).toBe(expected);
  });

  it.each(['abc', '0', '-5', '12,3,4', '1e3x'])('rechaza %s', (input) => {
    const row = one({ precio: input });
    expect(row.status).toBe('error');
    expect(row.messages).toContain('El precio debe ser un número mayor a 0');
  });
});

describe('validateImport — tipo de venta', () => {
  it.each([
    ['unidad', 'unit'],
    ['Unidad', 'unit'],
    ['unit', 'unit'],
    ['100gr', '100gr'],
    ['100 gr', '100gr'],
    ['100g', '100gr'],
    ['kg', 'kg'],
    ['KG', 'kg'],
    ['kilo', 'kg'],
    ['', 'unit'],
  ])('%j se importa como %s', (input, expected) => {
    expect(one({ 'tipo de venta': input }).product?.saleType).toBe(expected);
  });

  it('un tipo de venta desconocido es un error', () => {
    const row = one({ 'tipo de venta': 'litro' });
    expect(row.status).toBe('error');
    expect(row.messages).toContain('Tipo de venta inválido: usá unidad, 100gr o kg');
  });
});

describe('validateImport — activo e imagen', () => {
  it.each([
    ['sí', true],
    ['si', true],
    ['SI', true],
    ['', true],
    ['no', false],
    ['No', false],
  ])('activo %j se importa como %s', (input, expected) => {
    expect(one({ activo: input }).product?.active).toBe(expected);
  });

  it('un activo que no es sí/no es un error', () => {
    expect(one({ activo: 'quizás' }).messages).toContain('Activo debe ser sí o no');
  });

  it('una imagen de un host que la Store no puede mostrar es un error, y se puede dejar vacía', () => {
    const row = one({ imagen_url: 'https://prohibido.com/a.jpg' });
    expect(row.status).toBe('error');
    expect(row.messages).toContain(
      'La imagen tiene que estar en Supabase Storage, Cloudinary o Google. Dejá la celda vacía para usar la imagen genérica'
    );
    expect(one({ imagen_url: '' }).status).toBe('valid');
  });

  it('una imagen que no es una URL http(s) es un error', () => {
    expect(one({ imagen_url: 'foto.jpg' }).messages).toContain('La imagen debe ser una URL que empiece con http:// o https://');
  });
});

describe('validateImport — archivo', () => {
  it('sin una columna obligatoria rechaza el archivo entero', () => {
    const preview = validateImport(sheet([{ nombre: 'Papas', precio: 1 }], ['nombre', 'precio']), ctx);
    expect(preview.fileError).toBe('Falta la columna obligatoria: categoría');
    expect(preview.rows).toEqual([]);
  });

  it('lista todas las columnas obligatorias que faltan', () => {
    const preview = validateImport(sheet([], ['subcategoría']), ctx);
    expect(preview.fileError).toBe('Faltan las columnas obligatorias: nombre, categoría, precio');
  });

  it('más de 500 filas rechaza el archivo entero', () => {
    const rows = Array.from({ length: 501 }, (_, i) => ({ ...base, nombre: `P${i}` }));
    const preview = validateImport(sheet(rows), ctx);
    expect(preview.fileError).toBe('El archivo tiene 501 filas y el máximo es 500. Dividilo en partes.');
    expect(preview.rows).toEqual([]);
  });

  it('exactamente 500 filas se aceptan', () => {
    const rows = Array.from({ length: 500 }, (_, i) => ({ ...base, nombre: `P${i}` }));
    expect(validateImport(sheet(rows), ctx).fileError).toBeNull();
  });

  it('un archivo sin filas es un error', () => {
    expect(validateImport(sheet([]), ctx).fileError).toBe('El archivo no tiene filas para importar');
  });
});

describe('validateImport — duplicados', () => {
  const withExisting: ImportContext = { ...ctx, existingProductNames: ['Coca Cola 1.5 L', 'Papas'] };

  it('un nombre que ya existe en la Store es una advertencia de posible duplicado', () => {
    const row = one({ nombre: 'papas' }, withExisting);
    expect(row.status).toBe('warning');
    expect(row.duplicate).toBe(true);
    expect(row.messages).toContain('Posible duplicado: ya existe un producto con este nombre en la Store');
    expect(row.product).not.toBeNull();
  });

  it('no distingue mayúsculas, tildes ni espacios de más', () => {
    const ctxAccent: ImportContext = { ...ctx, existingProductNames: ['Jugo de Limón'] };
    expect(one({ nombre: '  jugo  de limon ' }, ctxAccent).duplicate).toBe(true);
  });

  it('un nombre nuevo no es duplicado', () => {
    const row = one({ nombre: 'Chizitos' }, withExisting);
    expect(row.duplicate).toBe(false);
    expect(row.status).toBe('valid');
  });

  it('un nombre repetido dentro del archivo marca las repeticiones, no la primera aparición', () => {
    const preview = validateImport(
      sheet([{ ...base, nombre: 'Chizitos' }, { ...base, nombre: 'Papas' }, { ...base, nombre: 'chizitos' }]),
      ctx
    );
    expect(preview.rows.map((r) => r.duplicate)).toEqual([false, false, true]);
    expect(preview.rows[2].messages).toContain('Nombre repetido en el archivo: ya aparece en la fila 2');
  });

  it('una fila con error no cuenta como duplicado de otra', () => {
    const preview = validateImport(
      sheet([{ ...base, nombre: 'Chizitos', precio: '' }, { ...base, nombre: 'Chizitos' }]),
      ctx
    );
    expect(preview.rows.map((r) => r.status)).toEqual(['error', 'valid']);
  });
});

describe('validateImport — categorías y subcategorías nuevas', () => {
  it('una categoría que existe se reconoce sin distinguir mayúsculas ni tildes y se usa su nombre', () => {
    const row = one({ 'categoría': 'gaseosas', subcategoría: 'cola' });
    expect(row.status).toBe('valid');
    expect(row.product).toMatchObject({ categoryName: 'Gaseosas', subcategoryName: 'Cola' });
  });

  it('una categoría que no existe es una advertencia y se lista para confirmar', () => {
    const preview = validateImport(sheet([{ ...base, 'categoría': 'Golosinas' }]), ctx);
    expect(preview.rows[0].status).toBe('warning');
    expect(preview.rows[0].messages).toContain('Categoría nueva: "Golosinas" se creará al confirmar');
    expect(preview.newCategories).toEqual(['Golosinas']);
    expect(preview.newSubcategories).toEqual([]);
  });

  it('una subcategoría que no existe en una categoría existente es una advertencia y se lista', () => {
    const preview = validateImport(sheet([{ ...base, 'categoría': 'Gaseosas', subcategoría: 'Naranja' }]), ctx);
    expect(preview.rows[0].status).toBe('warning');
    expect(preview.rows[0].messages).toContain('Subcategoría nueva: "Naranja" en "Gaseosas" se creará al confirmar');
    expect(preview.newCategories).toEqual([]);
    expect(preview.newSubcategories).toEqual([{ categoryName: 'Gaseosas', name: 'Naranja' }]);
  });

  it('una subcategoría de una categoría nueva se lista también', () => {
    const preview = validateImport(sheet([{ ...base, 'categoría': 'Golosinas', subcategoría: 'Chicles' }]), ctx);
    expect(preview.newCategories).toEqual(['Golosinas']);
    expect(preview.newSubcategories).toEqual([{ categoryName: 'Golosinas', name: 'Chicles' }]);
  });

  it('cada categoría o subcategoría nueva se lista una sola vez, con la grafía de su primera aparición', () => {
    const preview = validateImport(
      sheet([
        { ...base, nombre: 'A', 'categoría': 'Golosinas', subcategoría: 'Chicles' },
        { ...base, nombre: 'B', 'categoría': 'golosinas', subcategoría: 'CHICLES' },
      ]),
      ctx
    );
    expect(preview.newCategories).toEqual(['Golosinas']);
    expect(preview.newSubcategories).toEqual([{ categoryName: 'Golosinas', name: 'Chicles' }]);
    expect(preview.rows[1].product).toMatchObject({ categoryName: 'Golosinas', subcategoryName: 'Chicles' });
  });

  it('una fila con error no aporta categorías nuevas', () => {
    const preview = validateImport(sheet([{ ...base, 'categoría': 'Golosinas', precio: '' }]), ctx);
    expect(preview.newCategories).toEqual([]);
  });
});

describe('validateImport — columnas ignoradas', () => {
  it('las columnas de módulos apagados se ignoran con aviso', () => {
    const preview = validateImport(
      sheet([{ ...base, costo: 100, 'stock inicial': 5 }], [...HEADERS, 'costo', 'stock inicial']),
      ctx
    );
    expect(preview.ignoredColumns).toEqual([
      { name: 'costo', reason: 'module' },
      { name: 'stock inicial', reason: 'module' },
    ]);
    expect(preview.rows[0].status).toBe('valid');
  });

  it('una columna desconocida también se ignora', () => {
    const preview = validateImport(sheet([{ ...base, color: 'rojo' }], [...HEADERS, 'color']), ctx);
    expect(preview.ignoredColumns).toEqual([{ name: 'color', reason: 'unknown' }]);
  });

  it('un encabezado vacío no cuenta como columna', () => {
    expect(validateImport(sheet([{ ...base }], [...HEADERS, '', '  ']), ctx).ignoredColumns).toEqual([]);
  });

  it('sin columnas de más no hay nada ignorado', () => {
    expect(validateImport(sheet([{ ...base }]), ctx).ignoredColumns).toEqual([]);
  });
});

// #188 (spec #179): las columnas `costo` y `stock_inicial` existen solo si la Store tiene
// el módulo. Con el módulo apagado se ignoran y la vista previa lo avisa.
describe('validateImport — columnas de módulos (#188)', () => {
  const withModules = (modules: { costos: boolean; stock: boolean }): ImportContext => ({ ...ctx, modules });
  const MODULE_HEADERS = [...HEADERS, 'costo', 'stock_inicial'];
  const run = (row: Record<string, unknown>, modules: { costos: boolean; stock: boolean }, headers = MODULE_HEADERS) =>
    validateImport(sheet([{ ...base, ...row }], headers), withModules(modules));

  describe.each([
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ])('costos=%s, stock=%s', (costos, stock) => {
    it('toma las columnas de los módulos encendidos e ignora, con aviso, las de los apagados', () => {
      const preview = run({ costo: '12,5', stock_inicial: '4' }, { costos, stock });
      expect(preview.rows[0].status).toBe('valid');
      expect(preview.rows[0].product).toMatchObject({
        cost: costos ? 12.5 : null,
        initialStock: stock ? 4 : null,
      });
      expect(preview.ignoredColumns).toEqual([
        ...(costos ? [] : [{ name: 'costo', reason: 'module' }]),
        ...(stock ? [] : [{ name: 'stock_inicial', reason: 'module' }]),
      ]);
    });
  });

  describe('costo', () => {
    const on = { costos: true, stock: false };
    it('vacío es "sin costo registrado", no cero', () => {
      expect(run({ costo: '' }, on).rows[0].product?.cost).toBeNull();
    });
    it('un cero escrito a propósito se conserva', () => {
      expect(run({ costo: 0 }, on).rows[0].product?.cost).toBe(0);
    });
    it('acepta coma o punto decimal, y miles', () => {
      expect(run({ costo: '1.234,5' }, on).rows[0].product?.cost).toBe(1234.5);
      expect(run({ costo: '99.9' }, on).rows[0].product?.cost).toBe(99.9);
    });
    it.each(['abc', '-5', '12,3,4', '1000000000'])('"%s" es un error de la fila', (costo) => {
      const row = run({ costo }, on).rows[0];
      expect(row.status).toBe('error');
      expect(row.messages).toEqual(['El costo debe ser un número entre 0 y 999.999.999']);
      expect(row.product).toBeNull();
    });
    it('con el módulo apagado un costo inválido no rompe la fila: se ignora', () => {
      const row = run({ costo: 'abc' }, { costos: false, stock: false }).rows[0];
      expect(row.status).toBe('valid');
      expect(row.product?.cost).toBeNull();
    });
  });

  describe('stock inicial', () => {
    const on = { costos: false, stock: true };
    it('vacío no carga stock', () => {
      expect(run({ stock_inicial: '' }, on).rows[0].product?.initialStock).toBeNull();
    });
    it('acepta cero y decimales (productos por kg)', () => {
      expect(run({ stock_inicial: 0 }, on).rows[0].product?.initialStock).toBe(0);
      expect(run({ stock_inicial: '2,5' }, on).rows[0].product?.initialStock).toBe(2.5);
    });
    it.each(['abc', '-1', '1000000000'])('"%s" es un error de la fila', (stock_inicial) => {
      const row = run({ stock_inicial }, on).rows[0];
      expect(row.status).toBe('error');
      expect(row.messages).toEqual(['El stock inicial debe ser un número entre 0 y 999.999.999']);
    });
    it.each(['stock inicial', 'stock', 'Stock Inicial'])('reconoce el encabezado "%s"', (header) => {
      const preview = validateImport(
        sheet([{ ...base, [header]: 7 }], [...HEADERS, header]),
        withModules({ costos: false, stock: true })
      );
      expect(preview.rows[0].product?.initialStock).toBe(7);
      expect(preview.ignoredColumns).toEqual([]);
    });
  });

  it('una columna repetida del módulo encendido no se avisa como módulo no incluido', () => {
    const preview = validateImport(
      sheet([{ ...base, stock: 3, stock_inicial: 5 }], [...HEADERS, 'stock', 'stock_inicial']),
      withModules({ costos: false, stock: true })
    );
    expect(preview.rows[0].product?.initialStock).toBe(3);
    expect(preview.ignoredColumns).toEqual([{ name: 'stock_inicial', reason: 'unknown' }]);
  });

  it('el máximo de stock nunca se importa, con ningún módulo', () => {
    const preview = run({ 'máximo de stock': 9 }, { costos: true, stock: true }, [...MODULE_HEADERS, 'máximo de stock']);
    expect(preview.ignoredColumns).toEqual([{ name: 'máximo de stock', reason: 'module' }]);
  });

  it('un error en el costo no impide que otras filas se validen', () => {
    const preview = validateImport(
      sheet([{ ...base, nombre: 'A', costo: 'x' }, { ...base, nombre: 'B', costo: '5' }], MODULE_HEADERS),
      withModules({ costos: true, stock: false })
    );
    expect(preview.counts).toEqual({ valid: 1, warning: 0, error: 1 });
  });
});

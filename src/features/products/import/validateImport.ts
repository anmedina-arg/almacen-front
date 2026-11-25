/**
 * Validación de la Importación masiva (#179, ticket #182): filas de la
 * planilla + contexto de la Store → vista previa. Módulo puro — no lee
 * archivos ni toca la base; el parser y la ruta le pasan datos ya cargados.
 */

export type SaleType = 'unit' | '100gr' | 'kg';
export type RowStatus = 'valid' | 'warning' | 'error';

export type CellValue = string | number | boolean | null | undefined;

export interface ImportSheet {
  /** Encabezados tal como vienen en el archivo. */
  headers: string[];
  /** Cada fila, con sus celdas indexadas por el encabezado original. */
  rows: Record<string, CellValue>[];
}

/** Módulos de la Store que suman columnas a la Plantilla (#188). Los demás datos del Producto son siempre los mismos. */
export interface ImportModules {
  costos: boolean;
  stock: boolean;
}

export interface ImportContext {
  /** Qué módulos tiene la Store: decide qué columnas se leen y cuáles se ignoran con aviso. */
  modules: ImportModules;
  /** Si `next/image` puede mostrar esa URL (ver src/lib/images/imageHosts.ts). */
  isAllowedImageUrl: (url: string) => boolean;
  existingProductNames: string[];
  categories: { name: string; subcategories: string[] }[];
}

export interface ImportProduct {
  name: string;
  categoryName: string;
  subcategoryName: string | null;
  saleType: SaleType;
  price: number;
  imageUrl: string | null;
  active: boolean;
  /** Costo (módulo `costos`, #188). `null` = sin costo registrado; solo viene con el módulo encendido. */
  cost: number | null;
  /** Stock inicial (módulo `stock`, #188). `null` = no cargar stock; solo viene con el módulo encendido. */
  initialStock: number | null;
}

export interface PreviewRow {
  /** Número de fila en la planilla (el encabezado es la fila 1). */
  rowNumber: number;
  status: RowStatus;
  messages: string[];
  product: ImportProduct | null;
  /**
   * Nombre que ya existe en la Store o repetido en el archivo. La fila se
   * omite por defecto al confirmar; el usuario puede incluirla.
   */
  duplicate: boolean;
  /** Celdas tal como vinieron en el archivo, para devolver las filas rechazadas sin alterarlas. */
  source: Record<string, CellValue>;
}

export interface IgnoredColumn {
  name: string;
  /** `module`: columna de un módulo que la Store no tiene; `unknown`: no es de la Plantilla. */
  reason: 'module' | 'unknown';
}

export interface ImportPreview {
  fileError: string | null;
  /** Encabezados del archivo, para armar el CSV de filas rechazadas. */
  headers: string[];
  rows: PreviewRow[];
  counts: Record<RowStatus, number>;
  /** Categorías que no existen en la Store, a confirmar antes de crearlas. */
  newCategories: string[];
  newSubcategories: { categoryName: string; name: string }[];
  ignoredColumns: IgnoredColumn[];
}

type Field = 'name' | 'category' | 'subcategory' | 'saleType' | 'price' | 'imageUrl' | 'active' | 'cost' | 'initialStock';

const BASE_FIELD_BY_HEADER: Record<string, Field> = {
  nombre: 'name',
  categoria: 'category',
  subcategoria: 'subcategory',
  tipodeventa: 'saleType',
  precio: 'price',
  imagenurl: 'imageUrl',
  activo: 'active',
};

/** Columnas de cada módulo: solo se leen si la Store lo tiene; si no, caen en MODULE_COLUMNS y se ignoran. */
const COST_FIELD_BY_HEADER: Record<string, Field> = { costo: 'cost' };
const STOCK_FIELD_BY_HEADER: Record<string, Field> = { stockinicial: 'initialStock', stock: 'initialStock' };

function fieldsByHeader(modules: ImportModules): Record<string, Field> {
  return {
    ...BASE_FIELD_BY_HEADER,
    ...(modules.costos ? COST_FIELD_BY_HEADER : {}),
    ...(modules.stock ? STOCK_FIELD_BY_HEADER : {}),
  };
}

const foldCase = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Clave de comparación de encabezados y valores fijos: sin tildes, mayúsculas ni separadores. */
const compactKey = (value: string): string => foldCase(value).replace(/[\s_\-.]+/g, '');

const cellText = (value: CellValue): string => (value == null ? '' : String(value).trim());

const SALE_TYPES: Record<string, SaleType> = {
  '': 'unit',
  unidad: 'unit',
  unit: 'unit',
  '100gr': '100gr',
  '100g': '100gr',
  kg: 'kg',
  kilo: 'kg',
};

/**
 * Columnas que son de un módulo. Las de un módulo que la Store tiene se leen (ver
 * `fieldsByHeader`); las que quedan acá se ignoran con aviso. El máximo de stock nunca
 * se importa (spec #179): ninguna Store lo ve en la Plantilla.
 */
const MODULE_COLUMNS = new Set(['costo', 'stock', 'stockinicial', 'maxstock', 'stockmaximo', 'maximodestock']);

/** Clave de comparación de nombres de producto y categorías: sin tildes, mayúsculas ni espacios de más. */
const nameKey = (value: string): string => foldCase(value).replace(/\s+/g, ' ').trim();

const ACTIVE_VALUES: Record<string, boolean> = {
  '': true,
  si: true,
  yes: true,
  true: true,
  '1': true,
  no: false,
  false: false,
  '0': false,
};

export const MAX_IMPORT_ROWS = 500;
const MAX_NAME_LENGTH = 100;
const REQUIRED: { field: Field; label: string }[] = [
  { field: 'name', label: 'nombre' },
  { field: 'category', label: 'categoría' },
  { field: 'price', label: 'precio' },
];

/**
 * Acepta coma o punto como decimal. Con los dos a la vez, el último es el
 * decimal y el otro separa miles ("1.234,56" y "1,234.56"). Con un solo
 * tipo, repetido es inválido ("12,3,4") y una sola vez es el decimal.
 * Devuelve NaN si no es un número o es negativo; 0 es un número válido.
 */
function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[\s$]/g, '');
  if (!/^[0-9.,]+$/.test(cleaned)) return NaN;
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  let normalized: string;
  if (lastDot >= 0 && lastComma >= 0) {
    const decimal = lastDot > lastComma ? '.' : ',';
    const thousands = decimal === '.' ? ',' : '.';
    normalized = cleaned.split(thousands).join('').replace(decimal, '.');
  } else {
    const separator = lastDot >= 0 ? '.' : ',';
    if (cleaned.split(separator).length > 2) return NaN;
    normalized = cleaned.replace(separator, '.');
  }
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? value : NaN;
}

/** El Precio tiene que ser mayor a 0. */
const parsePrice = (raw: string): number => {
  const value = parseAmount(raw);
  return value > 0 ? value : NaN;
};

/** Tope de costo y stock inicial: lo que entra en las columnas de la base (NUMERIC(12,3) del stock) sin desbordar. */
const MAX_MODULE_AMOUNT = 999_999_999;

/** Campo numérico opcional de un módulo: vacío es `null`, y un valor inválido o fuera de rango es `NaN`. */
const parseOptionalAmount = (raw: string): number | null => {
  if (raw === '') return null;
  const value = parseAmount(raw);
  return value > MAX_MODULE_AMOUNT ? NaN : value;
};

export function validateImport(sheet: ImportSheet, ctx: ImportContext): ImportPreview {
  const emptyPreview = (fileError: string): ImportPreview => ({
    fileError,
    headers: sheet.headers,
    rows: [],
    counts: { valid: 0, warning: 0, error: 0 },
    newCategories: [],
    newSubcategories: [],
    ignoredColumns: [],
  });

  const fieldByHeader = fieldsByHeader(ctx.modules);
  const headerByField = new Map<Field, string>();
  for (const header of sheet.headers) {
    const field = fieldByHeader[compactKey(header)];
    if (field && !headerByField.has(field)) headerByField.set(field, header);
  }

  const missing = REQUIRED.filter(({ field }) => !headerByField.has(field)).map(({ label }) => label);
  if (missing.length === 1) return emptyPreview(`Falta la columna obligatoria: ${missing[0]}`);
  if (missing.length > 1) return emptyPreview(`Faltan las columnas obligatorias: ${missing.join(', ')}`);

  const cell = (row: Record<string, CellValue>, field: Field): string => {
    const header = headerByField.get(field);
    return header === undefined ? '' : cellText(row[header]);
  };

  const numbered = sheet.rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .filter(({ row }) => sheet.headers.some((header) => cellText(row[header]) !== ''));

  if (numbered.length === 0) return emptyPreview('El archivo no tiene filas para importar');
  if (numbered.length > MAX_IMPORT_ROWS) {
    return emptyPreview(
      `El archivo tiene ${numbered.length} filas y el máximo es ${MAX_IMPORT_ROWS}. Dividilo en partes.`
    );
  }

  const selectedHeaders = new Set(headerByField.values());
  const ignoredColumns: IgnoredColumn[] = sheet.headers
    .filter((header) => cellText(header) !== '' && !selectedHeaders.has(header))
    .map((header) => {
      const key = compactKey(header);
      // Una columna de un módulo que la Store sí tiene y quedó afuera es una repetida (p. ej. `stock` y
      // `stock_inicial` a la vez): no es "módulo no incluido".
      const moduleOff = MODULE_COLUMNS.has(key) && !(key in fieldByHeader);
      return { name: header, reason: moduleOff ? 'module' : 'unknown' };
    });

  const existingNames = new Set(ctx.existingProductNames.map(nameKey));
  const firstRowByName = new Map<string, number>();
  const categories = new Map(
    ctx.categories.map((c) => [
      nameKey(c.name),
      { name: c.name, subcategories: new Map(c.subcategories.map((sub) => [nameKey(sub), sub])) },
    ])
  );
  const newCategories: string[] = [];
  const newSubcategories: { categoryName: string; name: string }[] = [];

  const rows: PreviewRow[] = numbered.map(({ row, rowNumber }) => {
    const errors: string[] = [];

    const name = cell(row, 'name');
    if (!name) errors.push('El nombre es obligatorio');
    else if (name.length > MAX_NAME_LENGTH) errors.push(`El nombre no puede pasar de ${MAX_NAME_LENGTH} caracteres`);

    const categoryName = cell(row, 'category');
    if (!categoryName) errors.push('La categoría es obligatoria');

    const rawPrice = cell(row, 'price');
    let price = NaN;
    if (!rawPrice) errors.push('El precio es obligatorio');
    else {
      price = parsePrice(rawPrice);
      if (Number.isNaN(price)) errors.push('El precio debe ser un número mayor a 0');
    }

    const saleType = SALE_TYPES[compactKey(cell(row, 'saleType'))];
    if (!saleType) errors.push('Tipo de venta inválido: usá unidad, 100gr o kg');

    const active = ACTIVE_VALUES[compactKey(cell(row, 'active'))];
    if (active === undefined) errors.push('Activo debe ser sí o no');

    const cost = parseOptionalAmount(cell(row, 'cost'));
    if (cost !== null && Number.isNaN(cost)) errors.push('El costo debe ser un número entre 0 y 999.999.999');

    const initialStock = parseOptionalAmount(cell(row, 'initialStock'));
    if (initialStock !== null && Number.isNaN(initialStock)) {
      errors.push('El stock inicial debe ser un número entre 0 y 999.999.999');
    }

    const imageUrl = cell(row, 'imageUrl');
    if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) {
      errors.push('La imagen debe ser una URL que empiece con http:// o https://');
    } else if (imageUrl && !ctx.isAllowedImageUrl(imageUrl)) {
      errors.push(
        'La imagen tiene que estar en Supabase Storage, Cloudinary o Google. Dejá la celda vacía para usar la imagen genérica'
      );
    }

    if (errors.length > 0) {
      return { rowNumber, status: 'error', messages: errors, product: null, duplicate: false, source: row };
    }

    const warnings: string[] = [];

    let category = categories.get(nameKey(categoryName));
    if (!category) {
      category = { name: categoryName, subcategories: new Map() };
      categories.set(nameKey(categoryName), category);
      newCategories.push(categoryName);
      warnings.push(`Categoría nueva: "${categoryName}" se creará al confirmar`);
    }

    const subcategory = cell(row, 'subcategory');
    let subcategoryName: string | null = null;
    if (subcategory) {
      subcategoryName = category.subcategories.get(nameKey(subcategory)) ?? null;
      if (subcategoryName === null) {
        subcategoryName = subcategory;
        category.subcategories.set(nameKey(subcategory), subcategory);
        newSubcategories.push({ categoryName: category.name, name: subcategory });
        warnings.push(`Subcategoría nueva: "${subcategory}" en "${category.name}" se creará al confirmar`);
      }
    }

    const key = nameKey(name);
    const firstRow = firstRowByName.get(key);
    let duplicate = false;
    if (existingNames.has(key)) {
      duplicate = true;
      warnings.push('Posible duplicado: ya existe un producto con este nombre en la Store');
    }
    if (firstRow !== undefined) {
      duplicate = true;
      warnings.push(`Nombre repetido en el archivo: ya aparece en la fila ${firstRow}`);
    } else {
      firstRowByName.set(key, rowNumber);
    }

    return {
      rowNumber,
      status: warnings.length > 0 ? 'warning' : 'valid',
      messages: warnings,
      duplicate,
      source: row,
      product: {
        name,
        categoryName: category.name,
        subcategoryName,
        saleType,
        price,
        imageUrl: imageUrl || null,
        active,
        cost,
        initialStock,
      },
    };
  });

  const counts = { valid: 0, warning: 0, error: 0 };
  for (const row of rows) counts[row.status]++;
  return { fileError: null, headers: sheet.headers, rows, counts, newCategories, newSubcategories, ignoredColumns };
}

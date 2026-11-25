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

export interface ImportContext {
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
}

export interface IgnoredColumn {
  name: string;
  /** `module`: columna de un módulo que la Store no tiene; `unknown`: no es de la Plantilla. */
  reason: 'module' | 'unknown';
}

export interface ImportPreview {
  fileError: string | null;
  rows: PreviewRow[];
  counts: Record<RowStatus, number>;
  /** Categorías que no existen en la Store, a confirmar antes de crearlas. */
  newCategories: string[];
  newSubcategories: { categoryName: string; name: string }[];
  ignoredColumns: IgnoredColumn[];
}

type Field = 'name' | 'category' | 'subcategory' | 'saleType' | 'price' | 'imageUrl' | 'active';

const FIELD_BY_HEADER: Record<string, Field> = {
  nombre: 'name',
  categoria: 'category',
  subcategoria: 'subcategory',
  tipodeventa: 'saleType',
  precio: 'price',
  imagenurl: 'imageUrl',
  activo: 'active',
};

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
 * Columnas de módulos (costos, stock). La Plantilla de este ticket no trae
 * ninguna, así que siempre se ignoran con aviso. Cuando los tickets de costos
 * y stock las sumen según las flags de la Store, esta lista pasa a depender
 * del contexto: una Store con `costos` encendida no debe verla ignorada.
 */
const MODULE_COLUMNS = new Set(['costo', 'stock', 'stockinicial', 'maxstock', 'stockmaximo']);

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
 * Devuelve NaN si no es un número o no es mayor a 0.
 */
function parsePrice(raw: string): number {
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
  return Number.isFinite(value) && value > 0 ? value : NaN;
}

export function validateImport(sheet: ImportSheet, ctx: ImportContext): ImportPreview {
  const emptyPreview = (fileError: string): ImportPreview => ({
    fileError,
    rows: [],
    counts: { valid: 0, warning: 0, error: 0 },
    newCategories: [],
    newSubcategories: [],
    ignoredColumns: [],
  });

  const headerByField = new Map<Field, string>();
  for (const header of sheet.headers) {
    const field = FIELD_BY_HEADER[compactKey(header)];
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
    .map((header) => ({ name: header, reason: MODULE_COLUMNS.has(compactKey(header)) ? 'module' : 'unknown' }));

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

    const imageUrl = cell(row, 'imageUrl');
    if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) {
      errors.push('La imagen debe ser una URL que empiece con http:// o https://');
    }

    if (errors.length > 0) return { rowNumber, status: 'error', messages: errors, product: null, duplicate: false };

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
      product: {
        name,
        categoryName: category.name,
        subcategoryName,
        saleType,
        price,
        imageUrl: imageUrl || null,
        active,
      },
    };
  });

  const counts = { valid: 0, warning: 0, error: 0 };
  for (const row of rows) counts[row.status]++;
  return { fileError: null, rows, counts, newCategories, newSubcategories, ignoredColumns };
}

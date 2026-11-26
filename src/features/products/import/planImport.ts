import { DEFAULT_PRODUCT_IMAGE } from './defaultProductImage';
import type { CellValue, ImportPreview, ImportProduct } from './validateImport';

/**
 * Importación masiva, segunda mitad (#179, ticket #185): de la vista previa y
 * lo que el Store admin confirmó, qué se crea y qué queda afuera. Módulo puro.
 */

export interface ImportSelection {
  /** Filas (número de fila de la planilla) con posible duplicado que el usuario decidió crear igual. */
  includeDuplicateRows: number[];
}

/** Lo que el Store admin decidió al confirmar la Importación masiva. */
export type ConfirmImportOptions = ImportSelection & {
  /** Confirma crear las categorías y subcategorías nuevas que listó la vista previa. */
  confirmNewCategories: boolean;
};

export interface SkippedRow {
  rowNumber: number;
  reasons: string[];
  source: Record<string, CellValue>;
}

export interface ImportPlan {
  products: ImportProduct[];
  /** Solo las que necesitan las filas que se crean: una categoría usada nada más por filas omitidas no se crea. */
  newCategories: string[];
  newSubcategories: { categoryName: string; name: string }[];
  /** Filas con error o duplicadas omitidas, con su motivo. */
  skipped: SkippedRow[];
}

/**
 * Reparte las filas de la vista previa entre las que se crean y las que
 * quedan afuera: las que tienen error, y los posibles duplicados que el
 * usuario no incluyó. Las filas con advertencia (categoría nueva) se crean:
 * esa advertencia se confirma aparte, con `confirmNewCategories`.
 */
function partitionRows(
  preview: ImportPreview,
  selection: ImportSelection
): { products: ImportProduct[]; skipped: SkippedRow[] } {
  const included = new Set(selection.includeDuplicateRows);
  const products: ImportProduct[] = [];
  const skipped: SkippedRow[] = [];

  for (const row of preview.rows) {
    if (row.product === null || (row.duplicate && !included.has(row.rowNumber))) {
      skipped.push({ rowNumber: row.rowNumber, reasons: row.messages, source: row.source });
    } else {
      products.push({ ...row.product, imageUrl: row.product.imageUrl ?? DEFAULT_PRODUCT_IMAGE });
    }
  }
  return { products, skipped };
}

export function planImport(preview: ImportPreview, selection: ImportSelection): ImportPlan {
  const { products, skipped } = partitionRows(preview, selection);

  // La vista previa ya lista qué categorías y subcategorías no existen en la
  // Store; acá se quedan solo las que usa algún producto que se va a crear.
  const usedCategories = new Set(products.map((p) => p.categoryName));
  const newCategories = preview.newCategories.filter((name) => usedCategories.has(name));
  const newSubcategories = preview.newSubcategories.filter((sub) =>
    products.some((p) => p.categoryName === sub.categoryName && p.subcategoryName === sub.name)
  );

  return { products, newCategories, newSubcategories, skipped };
}

const CSV_DELIMITER = ';';

const csvCell = (value: CellValue): string => {
  const text = value == null ? '' : String(value);
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * CSV con las filas rechazadas, tal como el usuario las escribió, más una
 * columna `motivo`, para corregirlas y volver a subirlas en otra pasada. Usa
 * `;` y BOM para que Excel en español lo abra bien; el lector de archivos
 * detecta ese separador.
 */
export function buildRejectedRowsCsv(preview: ImportPreview, skipped: SkippedRow[]): string {
  const lines = [[...preview.headers, 'motivo'].map(csvCell).join(CSV_DELIMITER)];
  for (const row of skipped) {
    const cells = preview.headers.map((header) => csvCell(row.source[header]));
    cells.push(csvCell(row.reasons.join(' | ')));
    lines.push(cells.join(CSV_DELIMITER));
  }
  return `﻿${lines.join('\r\n')}\r\n`;
}

import ExcelJS from 'exceljs';
import { Readable } from 'node:stream';
import { ValidationError } from '@/lib/api/errors';
import type { CellValue, ImportSheet } from './validateImport';

/** Tope de filas leídas del archivo: bien por encima del máximo de 500 para poder avisarlo, sin cargar planillas enormes. */
const MAX_ROWS_READ = 2000;
export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;

/** Celda de ExcelJS → valor simple (fórmulas, links y texto con formato incluidos). */
function toCellValue(value: ExcelJS.CellValue): CellValue {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('result' in value) return toCellValue(value.result as ExcelJS.CellValue);
    if ('richText' in value) return value.richText.map((part) => part.text).join('');
    if ('text' in value) return String(value.text);
    return null;
  }
  return value;
}

/** Excel en español guarda el CSV con `;`; Google Sheets y el resto, con `,`. */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ';' : ',';
}

export async function parseImportFile(buffer: Buffer, filename: string): Promise<ImportSheet> {
  const extension = filename.toLowerCase().split('.').pop();
  const workbook = new ExcelJS.Workbook();

  try {
    if (extension === 'xlsx') {
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    } else if (extension === 'csv') {
      const text = buffer.toString('utf8').replace(/^﻿/, '');
      await workbook.csv.read(Readable.from([text]), { parserOptions: { delimiter: detectDelimiter(text) } });
    } else {
      throw new ValidationError('Formato no soportado: subí un archivo .xlsx o .csv');
    }
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError('No se pudo leer el archivo. Verificá que sea un .xlsx o .csv válido');
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) return { headers: [], rows: [] };

  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  for (let col = 1; col <= worksheet.columnCount; col++) {
    headers.push(String(toCellValue(headerRow.getCell(col).value) ?? '').trim());
  }

  const rows: Record<string, CellValue>[] = [];
  const lastRow = Math.min(worksheet.rowCount, MAX_ROWS_READ + 1);
  for (let r = 2; r <= lastRow; r++) {
    const row = worksheet.getRow(r);
    const record: Record<string, CellValue> = {};
    headers.forEach((header, index) => {
      if (header) record[header] = toCellValue(row.getCell(index + 1).value);
    });
    rows.push(record);
  }
  return { headers, rows };
}

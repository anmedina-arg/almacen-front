import ExcelJS from 'exceljs';
import { MAX_IMPORT_ROWS, type ImportModules } from './validateImport';

/**
 * Plantilla de importación (#179, tickets #182 y #188): la planilla vacía que el
 * Store admin descarga, completa y vuelve a subir. Siempre trae las columnas del
 * Producto y el Precio; suma `costo` con el módulo `costos` y `stock_inicial` con
 * el módulo `stock`. Nunca trae el máximo de stock, Combos ni Productos Surtidos.
 */
const BASE_HEADERS = [
  'nombre',
  'categoría',
  'subcategoría',
  'tipo de venta',
  'precio',
  'imagen_url',
  'activo',
] as const;

/** Encabezados de la Plantilla de una Store, según los módulos que tiene. */
export function templateHeaders(modules: ImportModules): string[] {
  return [...BASE_HEADERS, ...(modules.costos ? ['costo'] : []), ...(modules.stock ? ['stock_inicial'] : [])];
}

export type TemplateFormat = 'xlsx' | 'csv';

export const TEMPLATE_CONTENT_TYPES: Record<TemplateFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv; charset=utf-8',
};

const BASE_INSTRUCTIONS = [
  ['Columna', 'Qué poner'],
  ['nombre', 'Obligatoria. Hasta 100 caracteres.'],
  ['categoría', 'Obligatoria. Si no existe en la Store, se avisa en la vista previa y se crea al confirmar.'],
  ['subcategoría', 'Opcional.'],
  ['tipo de venta', 'unidad, 100gr o kg. Si queda vacía, unidad.'],
  ['precio', 'Obligatoria. Número mayor a 0, con coma o punto decimal.'],
  ['imagen_url', 'Opcional. Link que empiece con http:// o https://. Sin imagen se usa una genérica.'],
  ['activo', 'sí o no. Si queda vacía, sí.'],
];

const COST_INSTRUCTION = ['costo', 'Opcional. Número igual o mayor a 0, con coma o punto decimal. Vacío = sin costo registrado.'];
const STOCK_INSTRUCTION = ['stock_inicial', 'Opcional. Número igual o mayor a 0 (admite decimales). Vacío = no se carga stock.'];

function instructionRows(modules: ImportModules): string[][] {
  return [
    ...BASE_INSTRUCTIONS,
    ...(modules.costos ? [COST_INSTRUCTION] : []),
    ...(modules.stock ? [STOCK_INSTRUCTION] : []),
    ['', ''],
    [`Máximo ${MAX_IMPORT_ROWS} filas por archivo.`, ''],
  ];
}

export async function buildImportTemplate(format: TemplateFormat, modules: ImportModules): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Productos');
  sheet.addRow(templateHeaders(modules));

  if (format === 'csv') {
    // `;` y BOM: Excel en español separa por `;` y necesita el BOM para las
    // tildes. El lector de archivos detecta el separador, así que la planilla
    // vuelve a subirse igual.
    const csv = await workbook.csv.writeBuffer({ formatterOptions: { delimiter: ';' } });
    return Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(csv)]);
  }

  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((column) => {
    column.width = 20;
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  const instructions = workbook.addWorksheet('Instrucciones');
  instructions.addRows(instructionRows(modules));
  instructions.getColumn(1).width = 30;
  instructions.getColumn(2).width = 90;
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
